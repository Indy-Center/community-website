import type { Partner } from '$lib/cms/types';
import { CmsUnavailableError } from '$lib/server/cms';
import type { ReadPartnersDocument } from '$lib/server/cms/schema';
import { logger } from '$lib/server/logger';

type ReadCategory = ReadPartnersDocument['categories'][number];
type ReadPartner = ReadCategory['partners'][number];

/**
 * A partner's member perks as one visitor may see them. Anyone signed in gets them in full,
 * whatever their membership (decision 0002); a guest gets only how many there are, so a perk's
 * text and URL never reach their browser.
 */
export type VisibleMemberPerks =
	| { signedIn: true; count: number; perks: Partner['memberPerks'] }
	| { signedIn: false; count: number };

/** The partners document as one visitor may see it: member perks in their shape, nothing else changed. */
export type VisiblePartnersDocument = {
	categories: (Omit<ReadCategory, 'partners'> & {
		partners: (Omit<ReadPartner, 'memberPerks'> & { memberPerks: VisibleMemberPerks })[];
	})[];
};

/**
 * The partners document as the visitor in `locals` may see it, or null when the CMS is unavailable
 * and no copy is kept. Every page reads partners through here, so member perks are hidden from a
 * guest without the page having to remember. A partner category with no partners is left out,
 * should the CMS ever send one. Pages show a "couldn't be loaded" panel for null rather than an
 * error page; any other failure still throws.
 */
export async function readPartners(
	locals: Pick<App.Locals, 'cms' | 'user'>
): Promise<VisiblePartnersDocument | null> {
	let document: ReadPartnersDocument;
	try {
		document = await locals.cms.partners();
	} catch (err) {
		if (!(err instanceof CmsUnavailableError)) throw err;
		logger.error('Partners could not be loaded', err);
		return null;
	}

	const signedIn = Boolean(locals.user);
	return {
		categories: document.categories
			.filter((category) => category.partners.length > 0)
			.map((category) => ({
				...category,
				partners: category.partners.map(({ memberPerks, ...partner }) => ({
					...partner,
					memberPerks: signedIn
						? { signedIn: true as const, count: memberPerks.length, perks: memberPerks }
						: { signedIn: false as const, count: memberPerks.length }
				}))
			}))
	};
}
