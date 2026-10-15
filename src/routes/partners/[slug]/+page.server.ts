import { error } from '@sveltejs/kit';
import { readPartners } from '$lib/server/partners';
import type { PageServerLoad } from './$types';

/** A partner's member perks as this page's visitor may see them. */
export type { VisibleMemberPerks } from '$lib/server/partners';

/**
 * One published partner's page, with its partner category's name. An unknown or unpublished slug
 * is a 404; with the CMS down and no copy kept, the page says partners couldn't be loaded, as
 * `/partners` does. Member perks come as `readPartners` shapes them for the visitor, so a guest
 * gets only how many there are.
 */
export const load = (async ({ locals, params }) => {
	const partners = await readPartners(locals);
	if (!partners) return { state: 'unavailable' as const };

	for (const category of partners.categories) {
		const partner = category.partners.find((p) => p.slug === params.slug);
		if (!partner) continue;
		return {
			state: 'found' as const,
			categoryName: category.name,
			partner: {
				slug: partner.slug,
				name: partner.name,
				tagline: partner.tagline,
				paragraphs: paragraphs(partner.description),
				logo: partner.logo,
				banner: partner.banner,
				callsToAction: partner.callsToAction,
				socialLinks: partner.socialLinks,
				gallery: partner.gallery,
				memberPerks: partner.memberPerks
			}
		};
	}
	error(404, 'Partner not found');
}) satisfies PageServerLoad;

/** A description's paragraphs: separated by blank lines, with empty ones dropped. */
function paragraphs(description: string) {
	return description
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
}
