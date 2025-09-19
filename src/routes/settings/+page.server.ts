import { usersTable } from '$lib/db/schema/users';
import { userSettingsSchema, controllerSettingsSchema } from '$lib/forms/settings';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login/connect');
	}

	const isController = locals.user.membership === 'controller';
	
	// Pre-fill form with current user data
	const prefilledData = {
		preferredName: locals.user.preferredName || `${locals.user.firstName} ${locals.user.lastName}`,
		pronouns: locals.user.pronouns || '',
		...(isController ? { operatingInitials: locals.user.operatingInitials || '' } : {})
	};

	const schema = isController ? controllerSettingsSchema : userSettingsSchema;
	const form = await superValidate(prefilledData, zod4(schema));

	return {
		form,
		isController
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return redirect(302, '/login/connect');
		}
		
		const isController = locals.user.membership === 'controller';
		const schema = isController ? controllerSettingsSchema : userSettingsSchema;
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return fail(400, { form });
		}

		logger.info(`Updating settings for user ${locals.user.id}`);
		
		const updateData: any = {
			preferredName: form.data.preferredName,
			pronouns: form.data.pronouns || null
		};
		
		if (isController) {
			updateData.operatingInitials = form.data.operatingInitials;
		} else {
			// Clear operating initials for non-controllers
			updateData.operatingInitials = null;
		}
		
		await locals.db
			.update(usersTable)
			.set(updateData)
			.where(eq(usersTable.id, locals.user.id));

		return { form };
	}
};