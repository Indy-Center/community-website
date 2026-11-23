import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { usersTable, type User } from '$lib/db/schema/users';
import { buildPatch } from '$lib/server/copyProfiles';
import type { Database } from '$lib/server/db';
import {
	fetchUserinfo,
	patchIdentityUser,
	type IdentityUserPatch,
	type Userinfo
} from '$lib/server/identity';
import { logger } from '$lib/server/logger';
import { updateSessionData, type Session } from '$lib/server/session';

export const IDENTITY_RECHECK_MS = 5 * 60 * 1000;

/** The profile fields identity and the member's `users` row both hold. */
type ProfileValues = Pick<User, 'preferredName' | 'pronouns' | 'operatingInitials'>;

const CLAIM_OF = {
	preferredName: 'preferred_name',
	pronouns: 'pronouns',
	operatingInitials: 'operating_initials'
} as const satisfies Record<keyof ProfileValues, keyof IdentityUserPatch & keyof Userinfo>;

const FIELDS = Object.keys(CLAIM_OF) as (keyof ProfileValues)[];

/**
 * Brings the member's `users` row in line with identity's claims, and returns the user with the
 * values kept. Identity's value wins, except where identity holds none and the row holds one: a
 * member identity didn't know when the one-time copy ran. That value is written to identity
 * (through `buildPatch`, the copy's rules) and kept. If identity refuses or can't be reached it is
 * still kept, and the next check tries again; a value is never cleared for identity lacking it.
 */
export async function reconcileProfile(user: User, claims: Userinfo, db: Database): Promise<User> {
	const missing = FIELDS.filter((key) => claims[CLAIM_OF[key]] === null && user[key] !== null);
	const kept: ProfileValues = {
		preferredName: claims.preferred_name,
		pronouns: claims.pronouns,
		operatingInitials: claims.operating_initials
	};

	if (missing.length > 0) {
		const only = (key: keyof ProfileValues) => (missing.includes(key) ? user[key] : null);
		const { patch: built } = buildPatch(
			{
				cid: user.cid,
				firstName: user.firstName,
				lastName: user.lastName,
				preferredName: only('preferredName'),
				pronouns: only('pronouns'),
				operatingInitials: only('operatingInitials')
			},
			undefined
		);
		// A field the copy's rules give no value (a preferred name equal to the full name, initials
		// that aren't two letters) follows identity's empty one, as the copy did.
		const fill = missing.filter((key) => built[CLAIM_OF[key]] != null);
		if (fill.length > 0) {
			const patch: IdentityUserPatch = Object.fromEntries(
				fill.map((key) => [CLAIM_OF[key], built[CLAIM_OF[key]]])
			);
			try {
				await patchIdentityUser(env, user.cid, patch, 'profile backfill');
				for (const key of fill) kept[key] = built[CLAIM_OF[key]] ?? null;
				logger.info(`Filled ${user.cid}'s ${fill.join(', ')} in identity from community`);
			} catch (error) {
				for (const key of fill) kept[key] = user[key];
				logger.error(`Could not fill ${user.cid}'s ${fill.join(', ')} in identity`, error);
			}
		}
	}

	const changed = FIELDS.some((key) => kept[key] !== user[key]);
	if (!changed) return user;
	await db.update(usersTable).set(kept).where(eq(usersTable.id, user.id));
	return { ...user, ...kept };
}

/**
 * Asks identity for the signed-in member's claims at most every few minutes, keeping their roles
 * on the session, and reconciles their preferred name, pronouns and operating initials
 * (`reconcileProfile`), so a change made in identity (by staff, say) reaches the site's pages; the
 * user returned has them. Returns null when identity rejects the token: the member logged out or
 * was disabled there. If identity can't be reached, the last known roles stand.
 */
export async function checkIdentity(
	session: Session,
	user: User,
	db: Database
): Promise<{ roles: string[]; user: User } | null> {
	const data = session.data!;
	const lastKnown = { roles: data.identityRoles ?? [], user };
	if (Date.now() - (data.identityCheckedAt ?? 0) < IDENTITY_RECHECK_MS) {
		return lastKnown;
	}

	try {
		const claims = await fetchUserinfo(data.identityToken!);
		if (!claims) {
			return null;
		}
		await updateSessionData(
			session.id,
			{ ...data, identityRoles: claims.roles, identityCheckedAt: Date.now() },
			db
		);
		return { roles: claims.roles, user: await reconcileProfile(user, claims, db) };
	} catch (error) {
		logger.error('Identity userinfo check failed', error);
		return lastKnown;
	}
}
