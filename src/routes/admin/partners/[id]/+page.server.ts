import { isAdmin } from '$lib/utils/permissions';
import { error, redirect } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { partnersTable } from '$lib/db/schema/partners';
import { partnerSchema } from '$lib/forms/partners';
import { partnerValues } from '$lib/server/partners';
import { logger } from '$lib/server/logger';

export const load = async ({ locals, params }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/');
	}

	const partner = await locals.db.query.partnersTable.findFirst({
		where: eq(partnersTable.id, params.id)
	});
	if (!partner) {
		error(404, 'Partner not found');
	}

	const form = await superValidate(
		{
			name: partner.name,
			slug: partner.slug,
			category: partner.category,
			logoUrl: partner.logoUrl,
			description: partner.description,
			links: partner.links,
			sortOrder: partner.sortOrder,
			isPublished: partner.isPublished
		},
		zod4(partnerSchema)
	);

	return { form, partner: { id: partner.id, name: partner.name, slug: partner.slug } };
};

export const actions = {
	// Named (not default) because SvelteKit can't mix a default action with `delete`
	save: async ({ request, locals, params }) => {
		if (!isAdmin(locals.roles)) {
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await superValidate(request, zod4(partnerSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const clash = await locals.db.query.partnersTable.findFirst({
			where: and(eq(partnersTable.slug, form.data.slug), ne(partnersTable.id, params.id)),
			columns: { id: true }
		});
		if (clash) {
			return setError(form, 'slug', 'Another partner already uses this URL');
		}

		logger.info(`User ${locals.user?.id} updated partner "${form.data.name}" (${params.id})`);
		await locals.db
			.update(partnersTable)
			.set({ ...partnerValues(form.data), updatedAt: sql`(unixepoch())` })
			.where(eq(partnersTable.id, params.id));

		return redirect(302, '/admin/partners');
	},

	delete: async ({ locals, params }) => {
		if (!isAdmin(locals.roles)) {
			return fail(403, { message: 'Unauthorized' });
		}

		logger.info(`User ${locals.user?.id} deleted partner ${params.id}`);
		await locals.db.delete(partnersTable).where(eq(partnersTable.id, params.id));

		return redirect(302, '/admin/partners');
	}
};
