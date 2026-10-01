import { asc, eq } from 'drizzle-orm';
import { partnersTable } from '$lib/db/schema/partners';
import { groupPartnersByCategory } from '$lib/config/partners';
import { isAdmin } from '$lib/utils/permissions';

export const load = async ({ locals }) => {
	const partners = await locals.db
		.select({
			slug: partnersTable.slug,
			name: partnersTable.name,
			category: partnersTable.category,
			logoUrl: partnersTable.logoUrl
		})
		.from(partnersTable)
		.where(eq(partnersTable.isPublished, true))
		.orderBy(asc(partnersTable.sortOrder), asc(partnersTable.name));

	return {
		groups: groupPartnersByCategory(partners),
		canManage: isAdmin(locals.roles)
	};
};
