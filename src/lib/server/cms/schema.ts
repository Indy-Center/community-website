import { z } from 'zod';
import { logger } from '$lib/server/logger';
import { socialPlatforms, type PartnersDocument, type SocialPlatform } from '$lib/cms/types';

/**
 * The partners document's shape, checked before a response is kept, so a CMS answer that is not a
 * partners document is treated as the CMS failing. Mirrors `types.ts`, the contract. The
 * `satisfies` below fails the typecheck only if the schema lets through something the contract
 * does not allow, or leaves out a field it requires; a schema stricter than the contract still
 * passes. So lists of values, like the Social link platforms, are taken from `types.ts` rather
 * than repeated here.
 */

const image = z.object({ url: z.string(), alt: z.string(), width: z.number(), height: z.number() });

const callToAction = z.object({ label: z.string(), url: z.string() });

const memberPerk = z.object({ label: z.string(), url: z.string(), text: z.string() });

/**
 * Whether the site has an icon for this Social link's platform. A link on any other platform is
 * left out, and logged, rather than the whole document being refused: the CMS may offer a
 * platform before the site catches up.
 */
function isKnown(slug: string) {
	return (link: {
		platform: string;
		url: string;
	}): link is { platform: SocialPlatform; url: string } => {
		if ((socialPlatforms as readonly string[]).includes(link.platform)) return true;
		logger.warn(`Leaving out ${slug}'s Social link on unknown platform "${link.platform}"`, {
			url: link.url
		});
		return false;
	};
}

const partner = z
	.object({
		slug: z.string(),
		name: z.string(),
		tagline: z.string(),
		description: z.string(),
		logo: image,
		banner: image.nullable(),
		callsToAction: z.array(callToAction),
		memberPerks: z.array(memberPerk),
		socialLinks: z.array(z.object({ platform: z.string(), url: z.string() })),
		gallery: z.array(z.object({ thumbnail: image, large: image }))
	})
	.transform((p) => ({ ...p, socialLinks: p.socialLinks.filter(isKnown(p.slug)) }));

export const partnersDocument = z.object({
	categories: z.array(
		z.object({ id: z.string(), name: z.string(), blurb: z.string(), partners: z.array(partner) })
	)
}) satisfies z.ZodType<PartnersDocument>;
