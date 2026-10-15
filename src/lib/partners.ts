import type { SocialPlatform } from '$lib/cms/types';

/**
 * A Social link as the site shows it. One on a platform the site has no icon for yet (the CMS may
 * offer a platform before the site catches up) is `other`, and shown as a link to another site.
 */
export type SocialLink = { platform: SocialPlatform | 'other'; url: string };
