import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/');
	}

	return {
		user: locals.user,
		roles: locals.roles
	};
};