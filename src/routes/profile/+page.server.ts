import { usersTable } from '$lib/db/schema/users';
import { feedbackTable } from '$lib/db/schema/feedback';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { averageRating } from '$lib/utils/feedbackRatings';
import { getStaffBadges } from '$lib/server/staff';
import { profileSchema } from '$lib/forms/profile';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, desc, eq, sql } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

export const load = async ({ locals, url }) => {
	if (!locals.user) {
		return redirect(302, `/login/connect?returnUrl=${encodeURIComponent(url.pathname)}`);
	}

	const form = await superValidate({ bio: locals.user.bio ?? '' }, zod4(profileSchema));

	// Accepted feedback about this user. Published feedback is shown as staff chose to publish
	// it; unpublished feedback is shown as submitted, without the pilot's name or callsign.
	const feedback = await locals.db
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
		.where(
			and(eq(feedbackTable.controllerId, locals.user.id), eq(feedbackTable.status, 'approved'))
		)
		.orderBy(desc(feedbackTable.createdAt));

	// Only controllers on the roster have a public profile
	const rosterEntry = await locals.db.query.vatsimControllersTable.findFirst({
		where: eq(vatsimControllersTable.cid, locals.user.cid),
		columns: { cid: true }
	});

	return {
		form,
		feedback,
		averageRating: averageRating(feedback.map((f) => f.rating)),
		isController: locals.user.membership === 'controller',
		hasPublicProfile: !!rosterEntry,
		staffBadges: (await getStaffBadges(locals.db)).get(locals.user.cid) ?? []
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return redirect(302, '/login/connect');
		}

		const form = await superValidate(request, zod4(profileSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		logger.debug('Updating user profile', { userId: locals.user.id });

		await locals.db
			.update(usersTable)
			.set({ bio: form.data.bio || null })
			.where(eq(usersTable.id, locals.user.id));

		form.message = 'Profile saved';
		return { form };
	}
};
