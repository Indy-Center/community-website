import { describe, expect, it } from 'vitest';
import {
	BookingRefusedError,
	FRESH_MS,
	KEEP_MS,
	POSITIONS_PATH,
	bookingsApiFromEnv,
	createBookingsApi,
	memoryReadStore
} from './bookingsApi';

const BASE = 'https://bookings.example.test/api';
const CMS = 'https://cms.example.test';

type Answer = { status: number; body?: unknown };

/**
 * A stand-in for the booking system and the CMS feed: answers each request with the next queued
 * answer for its method and path (the last one repeats), and records every request.
 */
function fakeApi(answers: Record<string, Answer[]>) {
	const requests: { method: string; path: string; body: unknown; auth: string | null }[] = [];
	let down = false;

	const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input));
		const path = url.href.startsWith(BASE) ? url.href.slice(BASE.length) : url.pathname;
		const method = init?.method ?? 'GET';
		requests.push({
			method,
			path,
			body: init?.body ? JSON.parse(String(init.body)) : undefined,
			auth: new Headers(init?.headers).get('Authorization')
		});
		if (down) throw new TypeError('fetch failed');

		const queue = answers[`${method} ${path}`] ?? [{ status: 404, body: { message: 'Not found' } }];
		const answer = queue.length > 1 ? queue.shift()! : queue[0];
		if (answer.status === 204) return new Response(null, { status: 204 });
		return Response.json(answer.body ?? null, { status: answer.status });
	}) as typeof globalThis.fetch;

	return {
		fetch,
		requests,
		goDown() {
			down = true;
		}
	};
}

const wireBooking = {
	id: 5,
	externalId: 'ext-5',
	cid: '1000001',
	callsign: 'IND_TWR',
	type: 'booking',
	start: '2026-12-01T18:00:00.000Z',
	end: '2026-12-01T20:00:00.000Z',
	division: 'USA'
};

function client(api: ReturnType<typeof fakeApi>, clock = { now: 0 }) {
	return createBookingsApi({
		baseUrl: `${BASE}/`,
		apiKey: 'secret-key',
		cmsUrl: CMS,
		store: memoryReadStore(),
		fetch: api.fetch,
		now: () => clock.now
	});
}

const ok = (data: unknown): Answer => ({ status: 200, body: { success: true, data } });

describe('listOrgBookings', () => {
	it("reads our organization's bookings with the key, in the site's own shape", async () => {
		const api = fakeApi({ 'GET /org/bookings': [ok([wireBooking])] });

		expect(await client(api).listOrgBookings()).toEqual([
			{
				id: 5,
				externalId: 'ext-5',
				cid: 1000001,
				callsign: 'IND_TWR',
				type: 'booking',
				start: '2026-12-01 18:00:00',
				end: '2026-12-01 20:00:00'
			}
		]);
		expect(api.requests[0].auth).toBe('Bearer secret-key');
	});

	it('keeps the list for a short while, then asks again', async () => {
		const api = fakeApi({ 'GET /org/bookings': [ok([])] });
		const clock = { now: 0 };
		const bookings = client(api, clock);

		await bookings.listOrgBookings();
		await bookings.listOrgBookings();
		expect(api.requests).toHaveLength(1);

		clock.now = FRESH_MS + 1;
		await bookings.listOrgBookings();
		expect(api.requests).toHaveLength(2);
	});

	it('serves the last good list while the booking system is down, up to KEEP_MS', async () => {
		const api = fakeApi({ 'GET /org/bookings': [ok([wireBooking])] });
		const clock = { now: 0 };
		const bookings = client(api, clock);
		await bookings.listOrgBookings();

		api.goDown();
		clock.now = FRESH_MS + 1;
		expect(await bookings.listOrgBookings()).toHaveLength(1);

		clock.now = KEEP_MS + 1;
		await expect(bookings.listOrgBookings()).rejects.toThrow();
	});
});

describe('writes', () => {
	const booking = {
		externalId: 'ext-9',
		cid: 1000001,
		callsign: 'IND_GND',
		start: new Date('2026-12-01T18:00:00Z'),
		end: new Date('2026-12-01T19:00:00Z')
	};

	it('creates by our externalId, then reads the list afresh', async () => {
		const api = fakeApi({
			'GET /org/bookings': [ok([]), ok([wireBooking])],
			'POST /bookings/external': [{ status: 201, body: { success: true, data: wireBooking } }]
		});
		const bookings = client(api);

		await bookings.listOrgBookings();
		await bookings.createBooking(booking);
		expect(await bookings.listOrgBookings()).toHaveLength(1);

		expect(api.requests[1]).toMatchObject({
			method: 'POST',
			path: '/bookings/external',
			body: {
				externalId: 'ext-9',
				cid: '1000001',
				callsign: 'IND_GND',
				type: 'booking',
				start: '2026-12-01T18:00:00.000Z',
				end: '2026-12-01T19:00:00.000Z'
			}
		});
	});

	it("throws BookingRefusedError with the booking system's reason when it says no", async () => {
		const api = fakeApi({
			'POST /bookings/external': [
				{
					status: 409,
					body: { success: false, message: 'Overlaps', errors: { start: ['is taken'] } }
				}
			]
		});

		const refused = client(api).createBooking(booking);
		await expect(refused).rejects.toBeInstanceOf(BookingRefusedError);
		await expect(refused).rejects.toThrow('Overlaps (start: is taken)');
	});

	it('throws a plain error, not a refusal, for rate limits, a bad key and outages', async () => {
		for (const status of [429, 401, 503]) {
			const api = fakeApi({ 'POST /bookings/external': [{ status, body: { message: 'No' } }] });
			const error = await client(api)
				.createBooking(booking)
				.catch((e) => e);
			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(BookingRefusedError);
		}
	});

	it('changes times by externalId, and refuses a booking that is gone', async () => {
		const api = fakeApi({ 'PUT /bookings/external/ext-5': [ok(wireBooking)] });
		await client(api).updateBooking({
			externalId: 'ext-5',
			end: new Date('2026-12-01T21:00:00Z')
		});
		expect(api.requests[0].body).toEqual({ end: '2026-12-01T21:00:00.000Z' });

		await expect(
			client(fakeApi({})).updateBooking({ externalId: 'gone', end: new Date() })
		).rejects.toBeInstanceOf(BookingRefusedError);
	});

	it('counts a cancel of a booking that is already gone as done', async () => {
		await expect(client(fakeApi({})).cancelBooking({ externalId: 'gone' })).resolves.toBe(
			undefined
		);
	});
});

describe('getPositions', () => {
	it('reads the CMS feed without the key, leaving out retired positions', async () => {
		const facility = { id: 'IND', name: 'Indianapolis', parent: null };
		const api = fakeApi({
			[`GET ${POSITIONS_PATH}`]: [
				{
					status: 200,
					body: [
						{
							callsign: 'IND_TWR',
							name: 'Local',
							radioName: 'Indy Tower',
							frequency: 1,
							starred: true,
							facility,
							requiredCredentials: [{ anyOf: ['A-LC'] }]
						},
						{ callsign: 'IND_OLD', retired: true, facility }
					]
				}
			]
		});

		const positions = await client(api).getPositions();

		expect(positions.map((p) => [p.callsign, p.starred])).toEqual([['IND_TWR', true]]);
		expect(api.requests[0].auth).toBeNull();
	});
});

describe('bookingsApiFromEnv', () => {
	it('is off unless both the base URL and the key are set', () => {
		const store = memoryReadStore();
		expect(bookingsApiFromEnv({ VATSIM_BOOKING_API_KEY: 'k' }, store)).toBeUndefined();
		expect(bookingsApiFromEnv({ VATSIM_BOOKING_API_URL: BASE }, store)).toBeUndefined();
		expect(
			bookingsApiFromEnv({ VATSIM_BOOKING_API_URL: BASE, VATSIM_BOOKING_API_KEY: 'k' }, store)
		).toBeDefined();
	});
});
