import { describe, expect, it } from 'vitest';
import { partners } from '$lib/testing/fixtures';
import { fakeCms, site, run, type Site, type Visitor } from '$lib/testing/site';
import { load } from './+page.server';

/** A request for `slug`'s page, from a guest unless `as` says otherwise, to a fresh site or `s`. */
function partnerPage(slug: string, { as = 'guest', s = site() }: { as?: Visitor; s?: Site } = {}) {
	return s.event(`/partners/${slug}`, { params: { slug }, as });
}

describe('/partners/[slug]', () => {
	it('shows the partner with its partner category name', async () => {
		const data = await run(load, partnerPage('example-scenery'));

		expect(data).toEqual({
			state: 'found',
			categoryName: 'Developers',
			partner: {
				slug: 'example-scenery',
				name: 'Example Scenery Co.',
				tagline: 'Hand-built airports for the Example region.',
				paragraphs: ['We build airports.', 'Lots of them.'],
				logo: {
					url: 'https://cms.example.test/media/example-scenery-logo.png',
					alt: 'example-scenery-logo.png',
					width: 256,
					height: 256
				},
				banner: {
					url: 'https://cms.example.test/media/example-scenery-banner.jpg',
					alt: 'example-scenery-banner.jpg',
					width: 2400,
					height: 750
				},
				callsToAction: [
					{ label: 'Visit website', url: 'https://scenery.example.test' },
					{ label: 'Download KXMP', url: 'https://scenery.example.test/kxmp' }
				],
				socialLinks: [{ platform: 'discord', url: 'https://discord.example.test/scenery' }],
				gallery: [
					{
						thumbnail: {
							url: 'https://cms.example.test/media/kxmp-thumb.jpg',
							alt: 'kxmp-thumb.jpg',
							width: 400,
							height: 225
						},
						large: {
							url: 'https://cms.example.test/media/kxmp.jpg',
							alt: 'kxmp.jpg',
							width: 1600,
							height: 900
						}
					}
				],
				memberPerks: { signedIn: false, count: 1 }
			}
		});
	});

	it("names the partner's own partner category", async () => {
		const data = await run(load, partnerPage('pretend-streamer'));

		expect(data).toMatchObject({ state: 'found', categoryName: 'Creators' });
	});

	it('gives a signed-in user each member perk in full, and how many there are', async () => {
		const data = await run(load, partnerPage('example-scenery', { as: 'signed-in' }));

		expect(data).toMatchObject({
			partner: {
				memberPerks: {
					signedIn: true,
					count: 1,
					perks: [
						{
							label: 'Claim discount',
							url: 'https://scenery.example.test/claim',
							text: 'SECRET-PERK-1: 20% off with code EXAMPLE20.'
						}
					]
				}
			}
		});
	});

	it('tells a guest only how many member perks there are', async () => {
		const data = await run(load, partnerPage('example-scenery'));

		expect(data).toMatchObject({ partner: { memberPerks: { signedIn: false, count: 1 } } });
	});

	it("never puts a member perk's label, text or URL in a guest's data", async () => {
		const data = JSON.stringify(await run(load, partnerPage('example-scenery')));

		expect(data).not.toContain('SECRET-PERK-1');
		expect(data).not.toContain('Claim discount');
		expect(data).not.toContain('https://scenery.example.test/claim');
	});

	it('splits the description into paragraphs on blank lines, dropping empty ones', async () => {
		const document = structuredClone(partners);
		document.categories[1].partners[0].description =
			'First paragraph,\nstill the first.\r\n\r\nSecond.\n  \n\n\nThird.\n\n';
		const s = site({ cms: fakeCms({ '/api/community/partners': document }) });

		const data = await run(load, partnerPage('pretend-streamer', { s }));

		expect(data).toMatchObject({
			partner: { paragraphs: ['First paragraph,\nstill the first.', 'Second.', 'Third.'] }
		});
	});

	it('shows a partner with no call to action', async () => {
		const document = structuredClone(partners);
		document.categories[0].partners[1].callsToAction = [];
		const s = site({ cms: fakeCms({ '/api/community/partners': document }) });

		const data = await run(load, partnerPage('sample-tools', { s }));

		expect(data).toMatchObject({
			state: 'found',
			partner: { slug: 'sample-tools', callsToAction: [] }
		});
	});

	it("says partners couldn't be loaded when the CMS is down and no copy is kept", async () => {
		const s = site();
		s.cms.down();

		const data = await run(load, partnerPage('example-scenery', { s }));

		expect(data).toEqual({ state: 'unavailable' });
	});

	it("says Partner not found for a slug that isn't published", async () => {
		await expect(run(load, partnerPage('no-such-partner'))).rejects.toMatchObject({
			status: 404,
			body: { message: 'Partner not found' }
		});
	});
});
