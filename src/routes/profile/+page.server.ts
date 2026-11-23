import { fail, redirect } from '@sveltejs/kit';
import { toastFromServer } from '@indy-center/centerline-svelte';
import { and, desc, eq, sql } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { env } from '$env/dynamic/private';
import { feedbackTable } from '$lib/db/schema/feedback';
import { usersTable, type User } from '$lib/db/schema/users';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import {
	PRONOUN_PRESETS,
	profileSchema,
	SAVED_MESSAGES,
	UNAVAILABLE,
	type SavedMessage
} from '$lib/forms/profile';
import { memberName } from '$lib/members';
import { inferNameChoice, preferredNameFor } from '$lib/profile/nameChoice';
import type { Database } from '$lib/server/db';
import { fetchUserinfo, updateOwnProfile, writeOperatingInitials } from '$lib/server/identity';
import { discordRow, TEAMSPEAK_LINKED, teamspeakRow, UNLINKED } from '$lib/profile/linkedAccounts';
import { setAccountsFlash, takeAccountsFlash } from '$lib/server/discordLink';
import { errorMessage, readLinks, resyncMember, syncedMessage } from '$lib/server/larry';
import { logger } from '$lib/server/logger';
import { readMemberCredentials } from '$lib/server/roster';
import type { Session } from '$lib/server/session';
import { getStaffBadges } from '$lib/server/staff';
import { averageRating } from '$lib/utils/feedbackRatings';
import { signInHref } from '$lib/utils/signIn';

/** The fields identity holds, plus the VATSIM name the name options are built from. */
type Values = {
	firstName: string;
	lastName: string;
	preferredName: string | null;
	pronouns: string | null;
	operatingInitials: string | null;
};

const localValues = (user: User): Values => ({
	firstName: user.firstName,
	lastName: user.lastName,
	preferredName: user.preferredName,
	pronouns: user.pronouns,
	operatingInitials: user.operatingInitials
});

/**
 * The member's values as identity holds them now (`/oauth/userinfo`), or null when identity
 * can't be reached, refuses, or this isn't an identity session.
 */
async function readIdentity(user: User, session: Session | undefined): Promise<Values | null> {
	const token = session?.data?.identityToken;
	if (!token) return null;
	try {
		const claims = await fetchUserinfo(token);
		if (!claims) return null;
		return {
			firstName: claims.given_name ?? user.firstName,
			lastName: claims.family_name ?? user.lastName,
			preferredName: claims.preferred_name,
			pronouns: claims.pronouns,
			operatingInitials: claims.operating_initials
		};
	} catch (error) {
		logger.error(`Could not read ${user.cid}'s profile from identity`, error);
		return null;
	}
}

async function readRosterEntry(db: Database, cid: string) {
	return db.query.vatsimControllersTable.findFirst({
		where: eq(vatsimControllersTable.cid, cid),
		columns: { cid: true, roles: true, namePrivacy: true }
	});
}

const isController = (user: User) => user.membership === 'controller';

export const load = async ({ locals, url, platform, cookies }) => {
	if (!locals.user) {
		return redirect(302, signInHref(`${url.pathname}${url.search}`));
	}
	const user = locals.user;

	// The link TeamSpeak's bot sent. Opening it only asks; the member's own click (the
	// linkTeamspeak action) links it. Linking on the GET would let anyone who sends a signed-in
	// member their own link take that member's TeamSpeak groups.
	const pendingTsLink = url.searchParams.get('ts') || null;

	const [
		identity,
		links,
		feedback,
		rosterEntry,
		{ held, credentials },
		assignments,
		teamRows,
		pocs
	] = await Promise.all([
		readIdentity(user, locals.session),
		readLinks(platform?.env.LARRY, user.cid),
		// Accepted feedback about this user. Published feedback is shown as staff chose to
		// publish it; unpublished feedback is shown as submitted, without the pilot's name or
		// callsign.
		locals.db
			.select({
				id: feedbackTable.id,
				rating: sql<string>`coalesce(${feedbackTable.publishedRating}, ${feedbackTable.rating})`,
				position: sql<string>`coalesce(${feedbackTable.publishedPosition}, ${feedbackTable.position})`,
				feedback: sql<
					string | null
				>`case when ${feedbackTable.publishMode} is null then ${feedbackTable.feedback} else ${feedbackTable.publishedFeedback} end`,
				callsign: feedbackTable.publishedCallsign,
				submitterName: feedbackTable.publishedPilotName,
				publishMode: feedbackTable.publishMode,
				createdAt: feedbackTable.createdAt
			})
			.from(feedbackTable)
			.where(and(eq(feedbackTable.controllerId, user.id), eq(feedbackTable.status, 'approved')))
			.orderBy(desc(feedbackTable.createdAt)),
		// Only controllers on the roster have a public profile
		readRosterEntry(locals.db, user.cid),
		readMemberCredentials(locals.db, user.cid),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		locals.db.query.staffPocsTable.findMany()
	]);

	// Identity's values win over the local copies; the next save keeps them locally
	const values = identity ?? localValues(user);
	const hasNamePrivacy = rosterEntry?.namePrivacy ?? false;
	const controller = isController(user);
	const vatsimName = { cid: user.cid, firstName: values.firstName, lastName: values.lastName };
	const { choice, customName, privacyDefault } = inferNameChoice({
		...vatsimName,
		preferredName: values.preferredName,
		namePrivacy: hasNamePrivacy
	});
	const pronounsPreset = (PRONOUN_PRESETS as readonly string[]).includes(values.pronouns ?? '');

	const form = await superValidate(
		{
			nameChoice: choice,
			preferredName: customName,
			pronounsChoice: !values.pronouns
				? ''
				: pronounsPreset
					? (values.pronouns as (typeof PRONOUN_PRESETS)[number])
					: 'custom',
			customPronouns: values.pronouns && !pronounsPreset ? values.pronouns : '',
			bio: user.bio ?? '',
			operatingInitials: controller ? (values.operatingInitials ?? '') : ''
		},
		zod4(profileSchema(controller ? { operatingInitials: values.operatingInitials } : null)),
		{ errors: false }
	);

	const accountsFlash = takeAccountsFlash(cookies);

	return {
		form,
		editing: url.searchParams.has('edit'),
		/** The TeamSpeak link the member opened, waiting for them to confirm it. */
		pendingTsLink,
		/** False when identity can't be read: edit mode is then shown disabled. */
		canSave: identity !== null,
		shownName: memberName({
			...vatsimName,
			preferredName: values.preferredName,
			namePrivacy: hasNamePrivacy
		}),
		vatsimName,
		hasNamePrivacy,
		privacyDefault,
		pronouns: values.pronouns,
		bio: user.bio,
		isController: controller,
		operatingInitials: controller ? values.operatingInitials : null,
		// A controller on the roster whom automatic assignment found no free pair for
		needsInitials: controller && !!rosterEntry && !values.operatingInitials,
		/** larry's view of the member's Discord and TeamSpeak; null when larry can't be asked. */
		links,
		hasDiscord: !!links?.discord,
		/** The Linked accounts panel's Discord row; null when larry can't be asked. */
		discord: links ? discordRow(links.discord, accountsFlash?.discord) : null,
		/** The Linked accounts panel's TeamSpeak row; null when larry can't be asked. */
		teamspeak: links ? teamspeakRow(links.teamspeak) : null,
		/** A Linked accounts failure to show on the panel; successes are toasts. */
		accountsMessage:
			accountsFlash?.level && accountsFlash.message
				? { level: accountsFlash.level, message: accountsFlash.message }
				: null,
		feedback,
		averageRating: averageRating(feedback.map((f) => f.rating)),
		hasPublicProfile: !!rosterEntry,
		// Manually assigned staff can be off the roster, so badges don't need a roster entry
		staffBadges:
			getStaffBadges(rosterEntry ? [rosterEntry] : [], assignments, teamRows, pocs).get(user.cid) ??
			[],
		certifications: held?.certification ? [held.certification] : [],
		endorsements: held?.endorsements ?? [],
		credentials: credentials.map(({ code, name }) => ({ code, name }))
	};
};

export const actions = {
	// The edit form, posted to ?edit&/save so a refusal without JavaScript stays in edit mode
	save: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			return redirect(302, signInHref('/profile?edit'));
		}
		const user = locals.user;
		const controller = isController(user);

		const formData = await request.formData();
		// Initials aren't in a non-controller's form, so they aren't accepted from one
		if (!controller && formData.has('operatingInitials')) {
			return fail(400);
		}

		const identity = await readIdentity(user, locals.session);
		const current = identity ?? localValues(user);
		const form = await superValidate(
			formData,
			zod4(profileSchema(controller ? { operatingInitials: current.operatingInitials } : null))
		);
		if (!form.valid) {
			return fail(400, { form });
		}
		if (!identity) {
			form.message = UNAVAILABLE;
			return fail(503, { form });
		}

		const { data } = form;
		const vatsimName = { cid: user.cid, firstName: current.firstName, lastName: current.lastName };
		const next = {
			preferredName: preferredNameFor(vatsimName, data.nameChoice, data.preferredName),
			pronouns:
				data.pronounsChoice === 'custom' ? data.customPronouns.trim() : data.pronounsChoice || null,
			operatingInitials: controller
				? data.operatingInitials.trim().toUpperCase() || null
				: current.operatingInitials,
			bio: data.bio.trim() || null
		};
		const nameChanged = next.preferredName !== current.preferredName;
		const pronounsChanged = next.pronouns !== current.pronouns;
		const initialsChanged = next.operatingInitials !== current.operatingInitials;

		// All or nothing, in this order: initials (community's client), then the member's own
		// fields (their token), then the local row. Each identity write leaves an undo, and any
		// later failure, the local row's included, runs them newest first, so identity is put
		// back to what it held.
		const identityToken = locals.session!.data!.identityToken!;
		const undo: { what: string; run: () => Promise<void> }[] = [];
		try {
			if (initialsChanged) {
				await writeOperatingInitials(env, user.cid, next.operatingInitials);
				undo.push({
					what: 'operating initials',
					run: () => writeOperatingInitials(env, user.cid, current.operatingInitials)
				});
			}
			if (nameChanged || pronounsChanged) {
				const fields = (values: Pick<Values, 'preferredName' | 'pronouns'>) => ({
					...(nameChanged ? { preferred_name: values.preferredName } : {}),
					...(pronounsChanged ? { pronouns: values.pronouns } : {})
				});
				await updateOwnProfile(env, identityToken, fields(next));
				undo.push({
					what: 'preferred name and pronouns',
					run: () => updateOwnProfile(env, identityToken, fields(current))
				});
			}
			const local = localValues(user);
			if (
				next.bio !== user.bio ||
				next.preferredName !== local.preferredName ||
				next.pronouns !== local.pronouns ||
				next.operatingInitials !== local.operatingInitials
			) {
				await locals.db.update(usersTable).set(next).where(eq(usersTable.id, user.id));
			}
		} catch (error) {
			logger.error(`Could not save ${user.cid}'s profile`, error);
			for (const step of undo.reverse()) {
				await step
					.run()
					.catch((undoError) =>
						logger.error(`Could not put back ${user.cid}'s ${step.what} in identity`, undoError)
					);
			}
			form.message = UNAVAILABLE;
			return fail(503, { form });
		}

		let saved: SavedMessage = 'saved';
		// Only the name reaches Discord: the nickname is the shown name, with no initials
		if (nameChanged) {
			const larry = platform?.env.LARRY;
			const [synced, links] = await Promise.all([
				resyncMember(larry, user.cid),
				readLinks(larry, user.cid)
			]);
			if (links?.discord) saved = synced.outcome === 'queued' ? 'soon' : 'later';
		}
		logger.info(`Saved the profile of ${user.cid}`, {
			nameChanged,
			pronounsChanged,
			initialsChanged
		});

		toastFromServer(cookies, 'success', SAVED_MESSAGES[saved]);
		return redirect(303, '/profile');
	},

	// The Linked accounts panel's buttons. Each acts for the session's CID, never one from the
	// request, and carries its message back to /profile.
	unlink: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			return redirect(302, signInHref('/profile'));
		}
		const { cid } = locals.user;
		// Discord unless the row's form says TeamSpeak
		const service =
			(await request.formData()).get('service') === 'teamspeak' ? 'teamspeak' : 'discord';
		try {
			const larry = platform?.env.LARRY;
			if (!larry) throw new Error('The LARRY binding is not set');
			await larry.unlink(Number(cid), service);
			logger.info(`Unlinked the ${service} account of ${cid}`);
			setAccountsFlash(cookies, { level: 'success', message: UNLINKED[service] });
		} catch (error) {
			logger.error(`Could not unlink the ${service} account of ${cid}`, error);
			setAccountsFlash(cookies, { level: 'danger', message: errorMessage(error) });
		}
		return redirect(303, '/profile');
	},

	// The confirm prompt for the link TeamSpeak's bot sent (/profile?ts=…): links that identity
	// to the session's CID
	linkTeamspeak: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			return redirect(302, signInHref('/profile'));
		}
		const { cid } = locals.user;
		const token = (await request.formData()).get('token');
		if (typeof token !== 'string' || !token) {
			return fail(400);
		}
		try {
			const larry = platform?.env.LARRY;
			if (!larry) throw new Error('The LARRY binding is not set');
			await larry.confirmTsLink(Number(cid), token);
			logger.info(`Linked the TeamSpeak identity of ${cid}`);
			setAccountsFlash(cookies, { level: 'success', message: TEAMSPEAK_LINKED });
		} catch (error) {
			logger.error(`Could not link the TeamSpeak identity of ${cid}`, error);
			setAccountsFlash(cookies, { level: 'danger', message: errorMessage(error) });
		}
		return redirect(303, '/profile');
	},

	syncRoles: async ({ locals, platform, cookies }) => {
		if (!locals.user) {
			return redirect(302, signInHref('/profile'));
		}
		setAccountsFlash(
			cookies,
			syncedMessage(await resyncMember(platform?.env.LARRY, locals.user.cid))
		);
		return redirect(303, '/profile');
	}
};
