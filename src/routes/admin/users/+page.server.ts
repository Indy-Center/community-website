import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/');
	}

	// Get all users with their roles
	const usersWithRoles = await locals.db.query.usersTable.findMany({
		with: {
			roles: true,
			certifications: true,
			endorsements: true
		}
	});

	return {
		users: usersWithRoles
	};
};
