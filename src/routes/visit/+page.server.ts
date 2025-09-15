import type { User } from '$lib/db/schema/users';
import { redirect } from '@sveltejs/kit';

const CALL_TO_ACTION_ROUTES = [
	{
		route: '/visit/get-connected',
		predicate: (user?: User) => !user
	},
	{
		route: '/visit/become-community-member',
		predicate: (user?: User) => user?.membership === 'basic'
	},
	{
		route: '/visit/become-a-controller',
		predicate: (user?: User) => user?.membership === 'community'
	}
];

export const load = async ({ locals }) => {
	const { user } = locals;

	const callToActionRoute = CALL_TO_ACTION_ROUTES.find((route) => route.predicate(user));

	if (callToActionRoute) {
		return redirect(302, callToActionRoute.route);
	}

	// Fallback - should not normally reach here
	return redirect(302, '/visit/get-connected');
};
