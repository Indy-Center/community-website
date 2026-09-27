import { error } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { feedbackTable } from '$lib/db/schema/feedback';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { getStaffBadges } from '$lib/server/staff';
import { readAvailableCredentials } from '$lib/server/roster';
import { customPreferredName } from '$lib/members';

// Public profile. Like the public roster, only controllers on the roster have one, and
// only public fields are sent (no email, raw VATSIM data, ratings summary, or feedback that
// wasn't published as identified).
export const load = async ({ locals, params }) => {
	const [controller, credentials, assignments, teamRows, pocs] = await Promise.all([
		locals.db.query.vatsimControllersTable.findFirst({
			where: eq(vatsimControllersTable.cid, params.cid),
			with: { user: true }
		}),
		readAvailableCredentials(locals.db),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		locals.db.query.staffPocsTable.findMany()
	]);

	if (!controller) {
		error(404, 'Controller not found');
	}

	const { firstName, lastName } = controller;
	const user = controller.user;

	// Settings pre-fills the preferred name with the full name, so only a preferred name
	// that differs from it counts as a real choice. Otherwise follow VATUSA name privacy.
	const name =
		customPreferredName(user?.preferredName, firstName, lastName) ??
		(controller.namePrivacy ? firstName : `${firstName} ${lastName}`);

	// Only feedback published as identified is public; everything else accepted stays on the
	// controller's private profile
	const feedback = user
		? await locals.db
				.select({
					id: feedbackTable.id,
					rating: sql<string>`coalesce(${feedbackTable.publishedRating}, ${feedbackTable.rating})`,
					position: sql<string>`coalesce(${feedbackTable.publishedPosition}, ${feedbackTable.position})`,
					feedback: feedbackTable.publishedFeedback,
					callsign: feedbackTable.publishedCallsign,
					pilotName: feedbackTable.publishedPilotName,
					createdAt: feedbackTable.createdAt
				})
				.from(feedbackTable)
				.where(
					and(
						eq(feedbackTable.controllerId, user.id),
						eq(feedbackTable.status, 'approved'),
						eq(feedbackTable.publishMode, 'identified')
					)
				)
				.orderBy(desc(feedbackTable.createdAt))
		: [];

	return {
		profile: {
			cid: controller.cid,
			name,
			pronouns: user?.pronouns ?? null,
			membership: user?.membership ?? ('controller' as const),
			operatingInitials: user?.operatingInitials ?? null,
			// The roster copy is refreshed from the training app every few minutes; the
			// account's VATSIM data is only saved at sign-in, so it can be out of date
			atcRating: controller.rating || user?.data.vatsim.rating.short || null,
			pilotRating: user?.data.vatsim.pilotrating.short || null,
			bio: user?.bio ?? null,
			staffBadges:
				getStaffBadges([controller], assignments, teamRows, pocs).get(controller.cid) ?? [],
			certifications: controller.certification ? [controller.certification] : [],
			endorsements: controller.endorsements,
			credentials: credentials.map(({ code, name }) => ({ code, name }))
		},
		feedback,
		isOwnProfile: locals.user?.cid === controller.cid
	};
};
