import { describe, expect, it } from 'vitest';
import { partners } from '$lib/testing/fixtures';
import { fakeCms, site, run } from '$lib/testing/site';
import { load } from './+page.server';

describe('/partners', () => {
	it('lists each partner category in order, with a card per partner and whether it has a member perk', async () => {
		const data = await run(load, site().event('/partners'));

		expect(data).toEqual({
			state: 'listed',
			categories: [
				{
					id: 'cat-developers',
					name: 'Developers',
					blurb: 'Scenery and tools made for flying through Indy.',
					partners: [
						{
							slug: 'example-scenery',
							name: 'Example Scenery Co.',
							tagline: 'Hand-built airports for the Example region.',
							logo: {
								url: 'https://cms.example.test/media/example-scenery-logo.png',
								alt: 'example-scenery-logo.png',
								width: 256,
								height: 256
							},
							socialLinks: [{ platform: 'discord', url: 'https://discord.example.test/scenery' }],
							callToAction: { label: 'Visit website', url: 'https://scenery.example.test' },
							photoCount: 1,
							hasMemberPerk: true
						},
						{
							slug: 'sample-tools',
							name: 'Sample Tools',
							tagline: 'Little utilities for controllers.',
							logo: {
								url: 'https://cms.example.test/media/sample-tools-logo.svg',
								alt: 'sample-tools-logo.svg',
								width: 256,
								height: 256
							},
							socialLinks: [
								{ platform: 'github', url: 'https://github.example.test/sample-tools' }
							],
							callToAction: { label: 'Get the tools', url: 'https://tools.example.test' },
							photoCount: 0,
							hasMemberPerk: false
						}
					]
				},
				{
					id: 'cat-creators',
					name: 'Creators',
					blurb: 'Streamers who fly and control with us.',
					partners: [
						{
							slug: 'pretend-streamer',
							name: 'Pretend Streamer',
							tagline: 'Weekly group flights into Example Field.',
							logo: {
								url: 'https://cms.example.test/media/pretend-streamer-logo.webp',
								alt: 'pretend-streamer-logo.webp',
								width: 256,
								height: 256
							},
							socialLinks: [
								{ platform: 'twitch', url: 'https://twitch.example.test/pretend' },
								{ platform: 'youtube', url: 'https://youtube.example.test/pretend' }
							],
							callToAction: { label: 'Watch live', url: 'https://twitch.example.test/pretend' },
							photoCount: 0,
							hasMemberPerk: false
						}
					]
				}
			]
		});
	});

	it("never sends a member perk's text or URL", async () => {
		const data = JSON.stringify(await run(load, site().event('/partners')));

		expect(data).not.toContain('SECRET-PERK-1');
		expect(data).not.toContain('https://scenery.example.test/claim');
	});

	it('lists a partner with no call to action, with no call to action on its card', async () => {
		const document = structuredClone(partners);
		document.categories[0].partners[1].callsToAction = [];
		const s = site({ cms: fakeCms({ '/api/community/partners': document }) });

		const data = await run(load, s.event('/partners'));
		const listed = await run(load, site().event('/partners'));

		expect(data).toMatchObject({
			state: 'listed',
			categories: [
				{ partners: [{ slug: 'example-scenery' }, { slug: 'sample-tools', callToAction: null }] },
				{ partners: [{ slug: 'pretend-streamer' }] }
			]
		});
		if (data.state !== 'listed' || listed.state !== 'listed') throw new Error('not listed');
		expect(data.categories[0].partners[0]).toEqual(listed.categories[0].partners[0]);
		expect(data.categories[1]).toEqual(listed.categories[1]);
	});

	it('sends the CMS the community credential', async () => {
		const s = site();
		await run(load, s.event('/partners'));

		expect(s.cms.authorizations).toEqual(['Bearer test-token']);
	});

	it('says Coming Soon when no partner is published', async () => {
		const cms = fakeCms({ '/api/community/partners': { categories: [] } });
		const data = await run(load, site({ cms }).event('/partners'));

		expect(data).toEqual({ state: 'coming-soon' });
	});

	it("says partners couldn't be loaded when the CMS is down and no copy is kept", async () => {
		const s = site();
		s.cms.down();

		const data = await run(load, s.event('/partners'));

		expect(data).toEqual({ state: 'unavailable' });
	});

	describe('the kept copy', () => {
		const MINUTE = 60_000;
		const DAY = 24 * 60 * MINUTE;

		it('is served for five minutes without asking the CMS again', async () => {
			const s = site();
			await run(load, s.event('/partners'));
			s.clock.now += 4 * MINUTE;
			await run(load, s.event('/partners'));

			expect(s.cms.asked('/api/community/partners')).toBe(1);

			s.clock.now += 2 * MINUTE;
			await run(load, s.event('/partners'));

			expect(s.cms.asked('/api/community/partners')).toBe(2);
		});

		it('is served when the CMS is down', async () => {
			const s = site();
			const fresh = await run(load, s.event('/partners'));
			s.clock.now += 6 * DAY;
			s.cms.down();

			const data = await run(load, s.event('/partners'));

			expect(s.cms.asked('/api/community/partners')).toBe(2);
			expect(data).toEqual(fresh);
		});

		it('is served when the CMS takes too long to answer', async () => {
			const s = site();
			const fresh = await run(load, s.event('/partners'));
			s.clock.now += 10 * MINUTE;
			s.cms.hang();

			const data = await run(load, s.event('/partners'));

			expect(fresh.state).toBe('listed');
			expect(data).toEqual(fresh);
		});

		it('is not served once it is over seven days old', async () => {
			const s = site();
			await run(load, s.event('/partners'));
			s.clock.now += 7 * DAY + MINUTE;
			s.cms.down();

			const data = await run(load, s.event('/partners'));

			expect(data).toEqual({ state: 'unavailable' });
		});
	});
});
