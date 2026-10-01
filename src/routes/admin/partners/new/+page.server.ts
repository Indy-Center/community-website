import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { partnersTable } from '$lib/db/schema/partners';
import { partnerSchema } from '$lib/forms/partners';
import { partnerValues } from '$lib/server/partners';
import { logger } from '$lib/server/logger';

export const load = async ({ locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/');
	}

	return { form: await superValidate(zod4(partnerSchema)) };
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!isAdmin(locals.roles)) {
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await superValidate(request, zod4(partnerSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const existing = await locals.db.query.partnersTable.findFirst({
			where: eq(partnersTable.slug, form.data.slug),
			columns: { id: true }
		});
		if (existing) {
			return setError(form, 'slug', 'Another partner already uses this URL');
		}

		logger.info(`User ${locals.user?.id} created partner "${form.data.name}"`);
		await locals.db
			.insert(partnersTable)
			.values({ id: crypto.randomUUID(), ...partnerValues(form.data) });

		return redirect(302, '/admin/partners');
	}
};
