import { userRolesTable } from '$lib/db/schema/roles';
import { usersTable } from '$lib/db/schema/users';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { readMemberCredentials } from '$lib/server/roster';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

export const load = async ({ params, locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/admin');
	}

	const { id } = params;

	const user = await locals.db.query.usersTable.findFirst({
		where: eq(usersTable.id, id),
		with: {
			roles: true
		}
	});

	if (!user) {
		return redirect(302, '/admin/users');
	}

	// Credentials come with the roster copy and are read-only here; `held` is null for someone
	// who isn't on the controller roster
	const { held, credentials } = await readMemberCredentials(locals.db, user.cid);

	return {
		user,
		held,
		credentials
	};
};

const toggleRoleSchema = z.object({
	role: z.string().min(1)
});

export const actions = {
	toggleRole: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			logger.warn(
				`Unauthorized role change attempt by user ${locals.user?.id} for target user ${params.id}`
			);
			return fail(403, { message: 'Unauthorized' });
		}

		const { id } = params;
		const form = await superValidate(request, zod4(toggleRoleSchema));

		if (!form.valid) {
			return fail(400, { form, message: 'Role is required' });
		}

		const role = form.data.role;

		try {
			// Check if the role exists
			const existingRole = await locals.db.query.userRolesTable.findFirst({
				where: and(eq(userRolesTable.userId, id), eq(userRolesTable.role, role))
			});

			if (existingRole) {
				// Remove role
				logger.info(`Admin ${locals.user?.id} removing role ${role} from user ${id}`);
				await locals.db
					.delete(userRolesTable)
					.where(and(eq(userRolesTable.userId, id), eq(userRolesTable.role, role)));
			} else {
				// Add role
				logger.info(`Admin ${locals.user?.id} adding role ${role} to user ${id}`);
				await locals.db.insert(userRolesTable).values({
					userId: id,
					role: role
				});
			}

			logger.info(`Role ${role} successfully toggled for user ${id} by admin ${locals.user?.id}`);
			return { success: true };
		} catch (error) {
			logger.error(
				`Failed to toggle role ${role} for user ${id} by admin ${locals.user?.id}`,
				error
			);
			return fail(500, { message: 'Failed to toggle role' });
		}
	}
};
