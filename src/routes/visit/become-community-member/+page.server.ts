import { usersTable } from '$lib/db/schema/users';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
	return {
		user: locals.user
	};
};

export const actions = {
	promoteToCommunity: async ({ locals, request }) => {
		await locals.db
			.update(usersTable)
			.set({ membership: 'community' })
			.where(eq(usersTable.id, locals.user.id));

		return { success: true };
	}
};
