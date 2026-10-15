import { error } from '@sveltejs/kit';
import { readPartners } from '$lib/server/partners';
import type { PageServerLoad } from './$types';

/**
 * One published partner's page, with its partner category's name. An unknown or unpublished slug
 * is a 404; with the CMS down and no copy kept, the page says partners couldn't be loaded, as
 * `/partners` does. Member perks go in full to anyone signed in to the site, whatever their
 * membership (decision 0002); both shapes say how many there are, and a guest gets only that, so a perk's text and URL never
 * reach their browser.
 */
export const load = (async ({ locals, params }) => {
	const partners = await readPartners(locals.cms);
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
				memberPerks: locals.user
					? {
							signedIn: true as const,
							count: partner.memberPerks.length,
							perks: partner.memberPerks
						}
					: { signedIn: false as const, count: partner.memberPerks.length }
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
