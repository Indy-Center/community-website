import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '$lib/server/logger';
import { partners } from '$lib/testing/fixtures';
import { fakeCms, site, run } from '$lib/testing/site';
import { load } from './+page.server';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

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
		const s = site({ cms: fakeCms(document) });

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

	it("passes through the alt text editors wrote for each partner's logo", async () => {
		const document = structuredClone(partners);
		document.categories[0].partners[0].logo.alt = 'Example Scenery Co. logo, a runway under a sun';
		const s = site({ cms: fakeCms(document) });

		const data = await run(load, s.event('/partners'));

		expect(data).toMatchObject({
			categories: [
				{ partners: [{ logo: { alt: 'Example Scenery Co. logo, a runway under a sun' } }, {}] },
				{}
			]
		});
	});

	describe('a Social link on a platform the site does not know', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		/** The example site, with Sample Tools also on a platform the site has no icon for. */
		function siteWithUnknownPlatform() {
			const document = structuredClone(partners);
			const links: unknown[] = document.categories[0].partners[1].socialLinks;
			links.unshift({ platform: 'myspace', url: 'https://myspace.example.test/sample-tools' });
			return site({ cms: fakeCms(document) });
		}

		it('is left out, and the rest of the partners document is listed', async () => {
			vi.spyOn(logger, 'warn').mockImplementation(() => {});

			const data = await run(load, siteWithUnknownPlatform().event('/partners'));
			const listed = await run(load, site().event('/partners'));

			expect(data).toEqual(listed);
		});

		it('is logged once', async () => {
			const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
			const s = siteWithUnknownPlatform();

			await run(load, s.event('/partners'));
			await run(load, s.event('/partners'));

			expect(warn).toHaveBeenCalledTimes(1);
			expect(String(warn.mock.calls[0][0])).toContain('myspace');
		});
	});

	it('sends the CMS the community credential', async () => {
		const s = site();
		await run(load, s.event('/partners'));

		expect(s.cms.requests).toEqual(['/api/community/partners']);
		expect(s.cms.authorizations).toEqual(['Bearer test-token']);
	});

	it('says Coming Soon when no partner is published', async () => {
		const cms = fakeCms({ categories: [] });
		const data = await run(load, site({ cms }).event('/partners'));

		expect(data).toEqual({ state: 'coming-soon' });
	});

	it("says partners couldn't be loaded when the CMS is down and no copy is kept", async () => {
		const s = site();
		s.cms.down();

		const data = await run(load, s.event('/partners'));

		expect(data).toEqual({ state: 'unavailable' });
	});

	it("says partners couldn't be loaded when the CMS answers with something that isn't a partners document and no copy is kept", async () => {
		const s = site({ cms: fakeCms({ nope: true }) });

		const data = await run(load, s.event('/partners'));

		expect(data).toEqual({ state: 'unavailable' });
	});

	describe("a response that isn't a partners document", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		/** Every line the site's logger writes at warn or error, from here on. */
		function logged() {
			const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
			const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
			return () => [...warn.mock.calls, ...error.mock.calls];
		}

		it('is logged once when the kept copy is served instead', async () => {
			const s = site();
			await run(load, s.event('/partners'));
			s.clock.now += 6 * MINUTE;
			s.cms.serve({ nope: true });
			const lines = logged();

			await run(load, s.event('/partners'));

			expect(lines()).toHaveLength(1);
		});

		it('is logged once when no copy is kept', async () => {
			const s = site({ cms: fakeCms({ nope: true }) });
			const lines = logged();

			await run(load, s.event('/partners'));

			expect(lines()).toHaveLength(1);
		});
	});

	describe('the kept copy', () => {
		it('is served for five minutes without asking the CMS again', async () => {
			const s = site();
			await run(load, s.event('/partners'));
			s.clock.now += 4 * MINUTE;
			await run(load, s.event('/partners'));

			expect(s.cms.requests).toHaveLength(1);

			s.clock.now += 2 * MINUTE;
			await run(load, s.event('/partners'));

			expect(s.cms.requests).toHaveLength(2);
		});

		it('is served when the CMS is down', async () => {
			const s = site();
			const fresh = await run(load, s.event('/partners'));
			s.clock.now += 6 * DAY;
			s.cms.down();

			const data = await run(load, s.event('/partners'));

			expect(s.cms.requests).toHaveLength(2);
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

		it("is served, and not replaced, when the CMS answers with something that isn't a partners document", async () => {
			const s = site();
			const fresh = await run(load, s.event('/partners'));
			s.clock.now += 6 * MINUTE;
			s.cms.serve({ nope: true });

			expect(await run(load, s.event('/partners'))).toEqual(fresh);

			s.clock.now += 6 * MINUTE;

			expect(await run(load, s.event('/partners'))).toEqual(fresh);
			expect(s.cms.requests).toHaveLength(3);
		});

		it('is replaced by a new partners document', async () => {
			const s = site();
			await run(load, s.event('/partners'));
			const renamed = structuredClone(partners);
			renamed.categories[0].partners[0].name = 'Renamed Scenery Co.';
			s.clock.now += 6 * MINUTE;
			s.cms.serve(renamed);
			const updated = await run(load, s.event('/partners'));
			s.clock.now += 6 * MINUTE;
			s.cms.down();

			const data = await run(load, s.event('/partners'));

			expect(JSON.stringify(updated)).toContain('Renamed Scenery Co.');
			expect(data).toEqual(updated);
		});

		describe("that isn't a partners document, as one kept by an earlier version of the site may not be", () => {
			afterEach(() => {
				vi.restoreAllMocks();
			});

			/** A site whose kept copy, fetched just now, is not a partners document. */
			async function siteWithBadCopy() {
				const s = site();
				await s.store.put({
					fetchedAt: s.clock.now,
					body: { nope: true }
				});
				return s;
			}

			it('is not served, and the CMS is asked instead', async () => {
				const s = await siteWithBadCopy();

				const data = await run(load, s.event('/partners'));

				expect(s.cms.requests).toHaveLength(1);
				expect(data).toEqual(await run(load, site().event('/partners')));
			});

			it('counts as no copy when the CMS is down', async () => {
				vi.spyOn(logger, 'error').mockImplementation(() => {});
				const s = await siteWithBadCopy();
				s.clock.now += 6 * MINUTE;
				s.cms.down();

				const data = await run(load, s.event('/partners'));

				expect(data).toEqual({ state: 'unavailable' });
			});
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
