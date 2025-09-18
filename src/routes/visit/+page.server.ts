import type { User } from '$lib/db/schema/users';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const { user } = locals;

	// No user - need to connect VATSIM account
	if (!user) {
		return redirect(302, '/visit/get-connected');
	}

	switch (user.membership) {
		case 'controller':
			// Controllers are at the top - no next step needed, redirect to get-connected
			return redirect(302, '/visit/get-connected');

		case 'community':
			// Community members can become controllers (regardless of division)
			return redirect(302, '/visit/become-a-controller');

		case 'basic':
			return redirect(302, '/visit/become-community-member');

		default:
			// User has VATSIM account but no membership - start with get-connected
			return redirect(302, '/visit/get-connected');
	}
};
