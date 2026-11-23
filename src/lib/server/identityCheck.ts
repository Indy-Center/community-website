import { eq } from 'drizzle-orm';
import { usersTable, type User } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { fetchUserinfo } from '$lib/server/identity';
import { logger } from '$lib/server/logger';
import { updateSessionData, type Session } from '$lib/server/session';

export const IDENTITY_RECHECK_MS = 5 * 60 * 1000;

/**
 * Asks identity for the signed-in member's claims at most every few minutes, keeping their roles
 * on the session. Their preferred name, pronouns and operating initials are copied into their
 * `users` row when they differ, so a change made in identity (by staff, say) reaches the site's
 * pages; the user returned has them. Returns null when identity rejects the token: the member
 * logged out or was disabled there. If identity can't be reached, the last known roles stand.
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

		const copies = {
			preferredName: claims.preferred_name,
			pronouns: claims.pronouns,
			operatingInitials: claims.operating_initials
		};
		const changed = (Object.keys(copies) as (keyof typeof copies)[]).some(
			(key) => copies[key] !== user[key]
		);
		if (changed) {
			await db.update(usersTable).set(copies).where(eq(usersTable.id, user.id));
		}
		return { roles: claims.roles, user: changed ? { ...user, ...copies } : user };
	} catch (error) {
		logger.error('Identity userinfo check failed', error);
		return lastKnown;
	}
}
