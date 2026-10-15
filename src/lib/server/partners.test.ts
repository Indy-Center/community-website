import { describe, expect, it } from 'vitest';
import { site } from '$lib/testing/site';
import { readPartners } from './partners';

/** The example partner with a member perk, as `visitor` is given it. */
async function perkPartner(as: 'guest' | 'signed-in') {
	const document = await readPartners(site().event('/', { as }).locals);
	return document?.categories[0].partners.find((p) => p.slug === 'example-scenery');
}

describe('readPartners', () => {
	it('gives a guest only how many member perks a partner has', async () => {
		const document = await readPartners(site().event('/').locals);

		expect((await perkPartner('guest'))?.memberPerks).toEqual({ signedIn: false, count: 1 });
		const sent = JSON.stringify(document);
		expect(sent).not.toContain('SECRET-PERK-1');
		expect(sent).not.toContain('Claim discount');
	});

	it('gives anyone signed in the member perks in full', async () => {
		expect((await perkPartner('signed-in'))?.memberPerks).toEqual({
			signedIn: true,
			count: 1,
			perks: [expect.objectContaining({ text: expect.stringContaining('SECRET-PERK-1') })]
		});
	});
});
