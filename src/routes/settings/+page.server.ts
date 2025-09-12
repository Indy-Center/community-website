import { usersTable } from '$lib/db/schema/users';
import { userSettingsSchema } from '$lib/forms/settings';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login/connect');
	}

	// Pre-fill form with current user data
	const prefilledData = {
		preferredName: locals.user.preferredName || `${locals.user.firstName} ${locals.user.lastName}`,
		pronouns: locals.user.pronouns || ''
	};

	const form = await superValidate(prefilledData, zod4(userSettingsSchema));

	return {
		form
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return redirect(302, '/login/connect');
		}
		
		const form = await superValidate(request, zod4(userSettingsSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		console.log(`Updating settings for user ${locals.user.id}`);
		await locals.db
			.update(usersTable)
			.set({
				preferredName: form.data.preferredName,
				pronouns: form.data.pronouns || null
			})
			.where(eq(usersTable.id, locals.user.id));

		return { form };
	}
};