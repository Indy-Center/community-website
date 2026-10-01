import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { partnersTable } from '$lib/db/schema/partners';
import { isAdmin } from '$lib/utils/permissions';

export const load = async ({ locals, params }) => {
	const partner = await locals.db.query.partnersTable.findFirst({
		where: eq(partnersTable.slug, params.slug)
	});

	const canManage = isAdmin(locals.roles);

	// Drafts are only visible to admins, as a preview
	if (!partner || (!partner.isPublished && !canManage)) {
		error(404, 'Partner not found');
	}

	return {
		partner: {
			id: partner.id,
			name: partner.name,
			category: partner.category,
			logoUrl: partner.logoUrl,
			description: partner.description,
			links: partner.links,
			isPublished: partner.isPublished
		},
		canManage
	};
};
