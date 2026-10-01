import { isAdmin } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { partnersTable } from '$lib/db/schema/partners';

export const load = async ({ locals }) => {
	if (!isAdmin(locals.roles)) {
		return redirect(302, '/');
	}

	const partners = await locals.db
		.select()
		.from(partnersTable)
		.orderBy(asc(partnersTable.sortOrder), asc(partnersTable.name));

	return { partners };
};
