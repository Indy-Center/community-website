import { canReviewFeedback, isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	// Feedback reviewers get the feedback section only; each page checks its own permission
	if (!isAdmin(locals.roles) && !canReviewFeedback(locals.roles)) {
		return redirect(302, '/');
	}

	return {
		user: locals.user,
		roles: locals.roles
	};
};
