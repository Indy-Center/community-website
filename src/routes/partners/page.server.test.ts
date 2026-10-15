import { describe, expect, it } from 'vitest';
import { fakeCms, site, run } from '$lib/testing/site';
import { load } from './+page.server';

describe('/partners', () => {
	it('lists each partner category in order, with a card per partner', async () => {
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
							tagline: 'Hand-built airports for the Example region.'
						},
						{
							slug: 'sample-tools',
							name: 'Sample Tools',
							tagline: 'Little utilities for controllers.'
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
							tagline: 'Weekly group flights into Example Field.'
						}
					]
				}
			]
		});
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
