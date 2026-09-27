import { feedbackTable } from '$lib/db/schema/feedback';
import { FEEDBACK_STATUSES, type FeedbackStatus } from '$lib/utils/feedbackReview';
import { canReviewFeedback } from '$lib/utils/permissions';
import { getFeedbackReviewers } from '$lib/server/feedback';
import { redirect } from '@sveltejs/kit';
import { count } from 'drizzle-orm';

export const load = async ({ locals, url }) => {
	if (!canReviewFeedback(locals.roles)) {
		return redirect(302, '/admin');
	}

	const requested = url.searchParams.get('status');
	const status: FeedbackStatus = FEEDBACK_STATUSES.includes(requested as FeedbackStatus)
		? (requested as FeedbackStatus)
		: 'pending';
	const mine = url.searchParams.get('mine') === '1';

	const feedback = await locals.db.query.feedbackTable.findMany({
		where: (feedback, { and, eq }) =>
			mine && locals.user
				? and(eq(feedback.status, status), eq(feedback.assigneeId, locals.user.id))
				: eq(feedback.status, status),
		// New and follow up are worked oldest first; the filed ones read newest first
		orderBy: (feedback, { asc, desc }) =>
			status === 'pending' || status === 'follow_up'
				? [asc(feedback.createdAt)]
				: [desc(feedback.updatedAt)],
		with: {
			submitter: {
				columns: { firstName: true, lastName: true, preferredName: true, cid: true }
			},
			controller: {
				columns: { firstName: true, lastName: true, preferredName: true, cid: true }
			},
			assignee: {
				columns: { firstName: true, lastName: true, preferredName: true }
			}
		}
	});

	const counts = Object.fromEntries(FEEDBACK_STATUSES.map((s) => [s, 0])) as Record<
		FeedbackStatus,
		number
	>;
	const countRows = await locals.db
		.select({ status: feedbackTable.status, count: count() })
		.from(feedbackTable)
		.groupBy(feedbackTable.status);
	for (const row of countRows) {
		if (row.status in counts) counts[row.status] = row.count;
	}

	return {
		feedback,
		status,
		mine,
		counts,
		// For the follow up menu on new feedback
		reviewers: status === 'pending' ? await getFeedbackReviewers(locals.db) : [],
		userId: locals.user?.id
	};
};
