import { feedbackTable } from '$lib/db/schema/feedback';
import { memberPickerColumns } from '$lib/members';
import { countByStatus, FEEDBACK_STATUSES, type FeedbackStatus } from '$lib/utils/feedbackReview';
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

	const [feedback, countRows, reviewers] = await Promise.all([
		locals.db.query.feedbackTable.findMany({
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
				submitter: { columns: memberPickerColumns },
				controller: { columns: memberPickerColumns },
				assignee: { columns: memberPickerColumns }
			}
		}),
		locals.db
			.select({ status: feedbackTable.status, count: count() })
			.from(feedbackTable)
			.groupBy(feedbackTable.status),
		// For the follow up menu on new feedback
		status === 'pending' ? getFeedbackReviewers(locals.db) : []
	]);

	return {
		feedback,
		status,
		mine,
		counts: countByStatus(countRows),
		reviewers,
		userId: locals.user?.id
	};
};
