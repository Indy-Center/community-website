import type { Infer } from 'sveltekit-superforms';
import type { PartnerSchema } from '$lib/forms/partners';

// Column values for a saved partner form, shared by create and edit
export function partnerValues(data: Infer<PartnerSchema>) {
	return {
		name: data.name,
		slug: data.slug,
		category: data.category,
		logoUrl: data.logoUrl || null,
		description: data.description,
		links: data.links,
		sortOrder: data.sortOrder,
		isPublished: data.isPublished
	};
}
