import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { feedbackTable } from '$lib/db/schema/feedback';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { averageRating } from '$lib/utils/feedbackRatings';

// Public profile. Like the public roster, only controllers on the roster have one, and
// only public fields are sent (no email, raw VATSIM data, or individual feedback).
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

	// Only the rating values are needed for the average
	const ratings = user
		? await locals.db
				.select({ rating: feedbackTable.rating })
				.from(feedbackTable)
				.where(and(eq(feedbackTable.controllerId, user.id), eq(feedbackTable.status, 'approved')))
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
			bio: user?.bio ?? null
		},
		feedback: {
			average: averageRating(ratings.map((r) => r.rating)),
			count: ratings.length
		},
		isOwnProfile: locals.user?.cid === controller.cid
	};
};
