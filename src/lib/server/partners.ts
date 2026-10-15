import { CmsUnavailableError, type Cms } from '$lib/server/cms';
import type { PartnersDocument } from '$lib/server/cms/types';
import { logger } from '$lib/server/logger';

/**
 * The partners document for a page load, or null when the CMS is unavailable and no copy is kept.
 * Pages show a "couldn't be loaded" panel for null rather than an error page; any other failure
 * still throws.
 */
export async function readPartners(cms: Cms): Promise<PartnersDocument | null> {
	try {
		return await cms.partners();
	} catch (err) {
		if (!(err instanceof CmsUnavailableError)) throw err;
		logger.error('Partners could not be loaded', err);
		return null;
	}
}
