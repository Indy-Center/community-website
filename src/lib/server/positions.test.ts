import { describe, expect, it } from 'vitest';
import { memoryReadStore } from './keptReads';
import { createPositionsReader, POSITIONS_FRESH_MS, POSITIONS_PATH } from './positions';

const CMS = 'https://cms.example.test';

const facility = { id: 'IND', name: 'Indianapolis', parent: null };
const FEED = [
	{
		id: 'vnas-twr',
		callsign: 'IND_TWR',
		name: 'Local Control',
		shortName: 'IND LC',
		radioName: 'Indianapolis Tower',
		frequency: 120900000,
		starred: true,
		facility,
		requiredCredentials: [{ anyOf: ['A-LC'] }],
		retired: false
	},
	{
		id: 'vnas-old',
		callsign: 'IND_OLD_TWR',
		name: 'Old',
		radioName: 'Old',
		retired: true,
		facility
	}
];

/** A stand-in for the CMS feed, counting requests; `down()` makes them fail. */
function fakeCms() {
	const calls: { url: string; auth: string | null }[] = [];
	let down = false;
	const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({ url: String(input), auth: new Headers(init?.headers).get('Authorization') });
		if (down) throw new TypeError('fetch failed');
		return Response.json(FEED);
	}) as typeof globalThis.fetch;
	return { fetch, calls, down: () => (down = true) };
}

describe('the positions catalogue', () => {
	it("reads the CMS feed without a token, with every field Centerline's Position reads", async () => {
		const cms = fakeCms();
		const positions = await createPositionsReader({
			cmsUrl: CMS,
			store: memoryReadStore(),
			fetch: cms.fetch
		})();

		expect(cms.calls).toEqual([{ url: `${CMS}${POSITIONS_PATH}`, auth: null }]);
		expect(positions[0]).toMatchObject({
			id: 'vnas-twr',
			callsign: 'IND_TWR',
			name: 'Local Control',
			shortName: 'IND LC',
			radioName: 'Indianapolis Tower',
			frequency: 120900000,
			retired: false,
			starred: true
		});
		// Retired positions stay in the catalogue, as Centerline expects; bookings leave them out
		expect(positions[1]).toMatchObject({ callsign: 'IND_OLD_TWR', retired: true, shortName: null });
	});

	it('keeps a copy for a few minutes, and serves it while the CMS is failing', async () => {
		const cms = fakeCms();
		const clock = { now: 0 };
		const read = createPositionsReader({
			cmsUrl: CMS,
			store: memoryReadStore(),
			fetch: cms.fetch,
			now: () => clock.now
		});

		await read();
		await read();
		expect(cms.calls).toHaveLength(1);

		cms.down();
		clock.now = POSITIONS_FRESH_MS + 1;
		expect(await read()).toHaveLength(2);
	});

	it('gives no positions, never an error, when the CMS fails and nothing is kept', async () => {
		const cms = fakeCms();
		cms.down();

		await expect(
			createPositionsReader({ cmsUrl: CMS, store: memoryReadStore(), fetch: cms.fetch })()
		).resolves.toEqual([]);
	});
});
