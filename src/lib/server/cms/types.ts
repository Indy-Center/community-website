/**
 * COPIED from the CMS: `Indy-Center/payload`, the partners document its
 * `GET /api/community/partners` endpoint serves. That file is the contract; this is its copy. Change it there first, then copy
 * it here, and change the test fixtures (`src/lib/testing/fixtures.ts`) with it. Nothing below is
 * the site's own invention.
 *
 * The endpoint is read with the server credential in `COMMUNITY_API_TOKEN` as a bearer token. It
 * returns only published partners, in partner categories that have at least one, in order.
 *
 * Member perks are included. The site decides who sees them, in `$lib/server/partners`; nothing here is ever sent to a
 * browser as it stands.
 */

export type PartnersDocument = {
	/** In order, never empty. */
	categories: Category[];
};

export type Category = {
	id: string;
	name: string;
	blurb: string;
	/** In order, never empty. */
	partners: Partner[];
};

export type Partner = {
	slug: string;
	name: string;
	tagline: string;
	/** Paragraphs separated by blank lines. */
	description: string;
	logo: Image;
	banner: Image | null;
	/** One to three; the first is the primary one. */
	callsToAction: { label: string; url: string }[];
	memberPerks: { label: string; url: string; text: string }[];
	socialLinks: { platform: SocialPlatform; url: string }[];
	gallery: { thumbnail: Image; large: Image }[];
};

export type Image = { url: string; alt: string; width: number; height: number };

export type SocialPlatform =
	| 'twitch'
	| 'youtube'
	| 'discord'
	| 'x'
	| 'instagram'
	| 'tiktok'
	| 'facebook'
	| 'github'
	| 'web';
