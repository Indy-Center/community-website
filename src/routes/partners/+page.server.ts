import { readPartners } from '$lib/server/partners';
import type { PageServerLoad } from './$types';

/**
 * Every published partner, grouped by partner category in the CMS's order, as cards. With none
 * published the page says Coming Soon; with the CMS down and no copy kept, it says partners
 * couldn't be loaded rather than showing an error page.
 */
export const load = (async ({ locals }) => {
	const partners = await readPartners(locals.cms);
	if (!partners) return { state: 'unavailable' as const };
	const { categories } = partners;
	if (categories.length === 0) return { state: 'coming-soon' as const };

	return {
		state: 'listed' as const,
		categories: categories.map((category) => ({
			id: category.id,
			name: category.name,
			blurb: category.blurb,
			partners: category.partners.map((partner) => ({
				slug: partner.slug,
				name: partner.name,
				tagline: partner.tagline,
				logo: partner.logo,
				socialLinks: partner.socialLinks,
				// A partner can reach us with none; its card then has no button rather than breaking the page.
				callToAction: partner.callsToAction[0] ?? null,
				photoCount: partner.gallery.length,
				// Only whether there is one: perk text and URLs never reach a card.
				hasMemberPerk: partner.memberPerks.length > 0
			}))
		}))
	};
}) satisfies PageServerLoad;
