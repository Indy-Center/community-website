import { z } from 'zod';
import { PARTNER_CATEGORY_KEYS } from '$lib/config/partners';

// Only web links: z.url() alone also accepts schemes like javascript:
const webUrl = (message: string) => z.url({ protocol: /^https?$/, message });

export const partnerLinkSchema = z.object({
	label: z.string().trim().min(1, { message: 'Link label is required' }),
	url: webUrl('Link URL must start with http:// or https://')
});

export const partnerSchema = z.object({
	name: z.string().trim().min(1, { message: 'Partner name is required' }),
	slug: z
		.string()
		.trim()
		.min(1, { message: 'URL slug is required' })
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
			message: 'Use lowercase letters, numbers, and single hyphens'
		}),
	category: z.enum(PARTNER_CATEGORY_KEYS),
	// The form posts JSON, so a cleared input arrives as '' rather than null
	logoUrl: z
		.union([webUrl('Logo URL must start with http:// or https://'), z.literal('')])
		.optional()
		.nullable(),
	description: z.string().trim().min(1, { message: 'Description is required' }),
	links: z.array(partnerLinkSchema).default([]),
	sortOrder: z.number().int().default(0),
	isPublished: z.boolean().default(false)
});

export type PartnerSchema = typeof partnerSchema;

// URL slug suggested from a partner name, e.g. "vAMSYS Ltd." -> "vamsys-ltd"
export function slugify(name: string) {
	return name
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
