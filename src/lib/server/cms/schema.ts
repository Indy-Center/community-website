import { z } from 'zod';
import { socialPlatforms, type Category, type Partner, type SocialPlatform } from '$lib/cms/types';
import type { SocialLink } from '$lib/partners';

/**
 * The partners document's shape, checked before a response is kept, so a CMS answer that is not a
 * partners document is treated as the CMS failing. Mirrors `types.ts`, the contract, except that a
 * Social link on a platform the site has no icon for is kept as `other` rather than refused. The
 * `satisfies` below fails the typecheck only if the schema lets through something
 * `ReadPartnersDocument` does not allow, or leaves out a field it requires; a schema stricter than
 * that still passes. So lists of values, like the Social link platforms, are taken from `types.ts`
 * rather than repeated here.
 */

/** The partners document as the site reads it: the contract, with each Social link a `SocialLink`. */
export type ReadPartnersDocument = {
	categories: (Omit<Category, 'partners'> & {
		partners: (Omit<Partner, 'socialLinks'> & { socialLinks: SocialLink[] })[];
	})[];
};

const image = z.object({ url: z.string(), alt: z.string(), width: z.number(), height: z.number() });

const callToAction = z.object({ label: z.string(), url: z.string() });

const memberPerk = z.object({ label: z.string(), url: z.string(), text: z.string() });

function isKnownSocialPlatform(platform: string): platform is SocialPlatform {
	return (socialPlatforms as readonly string[]).includes(platform);
}

const socialLink = z.object({ platform: z.string(), url: z.string() }).transform(
	({ platform, url }): SocialLink => ({
		platform: isKnownSocialPlatform(platform) ? platform : 'other',
		url
	})
);

const partner = z.object({
	slug: z.string(),
	name: z.string(),
	tagline: z.string(),
	description: z.string(),
	logo: image,
	banner: image.nullable(),
	callsToAction: z.array(callToAction),
	memberPerks: z.array(memberPerk),
	socialLinks: z.array(socialLink),
	gallery: z.array(z.object({ thumbnail: image, large: image }))
});

export const partnersDocument = z.object({
	categories: z.array(
		z.object({ id: z.string(), name: z.string(), blurb: z.string(), partners: z.array(partner) })
	)
}) satisfies z.ZodType<ReadPartnersDocument>;
