import { z } from 'zod';
import { socialPlatforms, type PartnersDocument } from './types';

/**
 * The partners document's shape, checked before a response is kept, so a CMS answer that is not a
 * partners document is treated as the CMS failing. Mirrors `types.ts`, the contract. The
 * `satisfies` below fails the typecheck only if the schema lets through something the contract
 * does not allow, or leaves out a field it requires; a schema stricter than the contract still
 * passes. So lists of values, like the Social link platforms, are taken from `types.ts` rather
 * than repeated here.
 */

const image = z.object({ url: z.string(), alt: z.string(), width: z.number(), height: z.number() });

const link = z.object({ label: z.string(), url: z.string() });

const partner = z.object({
	slug: z.string(),
	name: z.string(),
	tagline: z.string(),
	description: z.string(),
	logo: image,
	banner: image.nullable(),
	callsToAction: z.array(link),
	memberPerks: z.array(link.extend({ text: z.string() })),
	socialLinks: z.array(
		z.object({
			platform: z.enum(socialPlatforms),
			url: z.string()
		})
	),
	gallery: z.array(z.object({ thumbnail: image, large: image }))
});

export const partnersDocument = z.object({
	categories: z.array(
		z.object({ id: z.string(), name: z.string(), blurb: z.string(), partners: z.array(partner) })
	)
}) satisfies z.ZodType<PartnersDocument>;
