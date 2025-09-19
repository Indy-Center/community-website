import { feedbackTable } from '$lib/db/schema/feedback';
import { notifyDiscordOfFeedbackStatusChange } from '$lib/server/discord';
import { isAdmin } from '$lib/utils/permissions';
import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

export const load = async ({ locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/admin');
	}

	// Get all feedback with submitter and controller user data
	const feedback = await locals.db.query.feedbackTable.findMany({
		orderBy: (feedback, { desc }) => [desc(feedback.createdAt)],
		with: {
			submitter: true,
			controller: true
		}
	});

	return {
		feedback
	};
};

export const actions = {
	approve: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) {
			logger.warn(`Unauthorized feedback approval attempt by user ${locals.user?.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const feedbackId = formData.get('feedbackId') as string;

		logger.info(`Admin ${locals.user?.id} approving feedback ${feedbackId}`);

		if (!feedbackId) {
			return fail(400, { message: 'Feedback ID is required' });
		}

		try {
			const [feedback] = await locals.db
				.update(feedbackTable)
				.set({
					status: 'approved',
					updatedAt: new Date()
				})
				.where(eq(feedbackTable.id, feedbackId))
				.returning();

			await notifyDiscordOfFeedbackStatusChange(locals.db, feedback, locals.user);
			logger.info(`Feedback ${feedbackId} approved by admin ${locals.user?.id}`);
			return { success: true };
		} catch (error) {
			logger.error(`Failed to approve feedback ${feedbackId} by admin ${locals.user?.id}`, error);
			return fail(500, { message: 'Failed to approve feedback' });
		}
	},

	reject: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) {
			logger.warn(`Unauthorized feedback rejection attempt by user ${locals.user?.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const feedbackId = formData.get('feedbackId') as string;

		logger.info(`Admin ${locals.user?.id} rejecting feedback ${feedbackId}`);

		if (!feedbackId) {
			return fail(400, { message: 'Feedback ID is required' });
		}

		try {
			const [feedback] = await locals.db
				.update(feedbackTable)
				.set({
					status: 'rejected',
					updatedAt: new Date()
				})
				.where(eq(feedbackTable.id, feedbackId))
				.returning();

			await notifyDiscordOfFeedbackStatusChange(locals.db, feedback, locals.user);
			logger.info(`Feedback ${feedbackId} rejected by admin ${locals.user?.id}`);
			return { success: true };
		} catch (error) {
			logger.error(`Failed to reject feedback ${feedbackId} by admin ${locals.user?.id}`, error);
			return fail(500, { message: 'Failed to reject feedback' });
		}
	}
};
