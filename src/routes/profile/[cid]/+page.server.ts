import { error } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { feedbackTable } from '$lib/db/schema/feedback';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { getStaffBadges } from '$lib/server/staff';

// Public profile. Like the public roster, only controllers on the roster have one, and
// only public fields are sent (no email, raw VATSIM data, ratings summary, or feedback that
// wasn't published as identified).
export const load = async ({ locals, params }) => {
	const controller = await locals.db.query.vatsimControllersTable.findFirst({
		where: eq(vatsimControllersTable.cid, params.cid),
		with: { user: true }
	});

	if (!controller) {
		error(404, 'Controller not found');
	}

	const roster = controller.data;
	const user = controller.user;

	// Settings pre-fills the preferred name with the full name, so only a preferred name
	// that differs from it counts as a real choice. Otherwise follow VATUSA name privacy.
	const normalize = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
	const preferredName = user?.preferredName?.trim();
	const hasCustomPreferredName =
		!!preferredName && normalize(preferredName) !== normalize(`${roster.fname} ${roster.lname}`);
	const name = hasCustomPreferredName
		? preferredName
		: roster.flag_nameprivacy
			? roster.fname
			: `${roster.fname} ${roster.lname}`;

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
			atcRating: user?.data.vatsim.rating.short ?? roster.rating_short ?? null,
			pilotRating: user?.data.vatsim.pilotrating.short || null,
			bio: user?.bio ?? null,
			staffBadges: (await getStaffBadges(locals.db)).get(controller.cid) ?? []
		},
		feedback,
		isOwnProfile: locals.user?.cid === controller.cid
	};
};
