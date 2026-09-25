import { usersTable } from '$lib/db/schema/users';
import { feedbackTable } from '$lib/db/schema/feedback';
import { profileSchema } from '$lib/forms/profile';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, desc, eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

export const load = async ({ locals, url }) => {
	if (!locals.user) {
		return redirect(302, `/login/connect?returnUrl=${encodeURIComponent(url.pathname)}`);
	}

	const form = await superValidate({ bio: locals.user.bio ?? '' }, zod4(profileSchema));

	// Approved feedback about this user, at every rating. The submitter and their
	// callsign are left out so feedback stays anonymous to the controller.
	const feedback = await locals.db
		.select({
			id: feedbackTable.id,
			rating: feedbackTable.rating,
			position: feedbackTable.position,
			feedback: feedbackTable.feedback,
			createdAt: feedbackTable.createdAt
		})
		.from(feedbackTable)
		.where(
			and(eq(feedbackTable.controllerId, locals.user.id), eq(feedbackTable.status, 'approved'))
		)
		.orderBy(desc(feedbackTable.createdAt));

	return {
		form,
		feedback,
		isController: locals.user.membership === 'controller'
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
