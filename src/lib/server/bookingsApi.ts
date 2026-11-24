import { logger } from '$lib/server/logger';
import type {
	AtcBooking,
	BookingType,
	BookingsClient,
	CmsPosition,
	NewBooking
} from '$lib/types/bookings';
import { formatBookingTime } from '$lib/utils/bookings';

/**
 * The booking system (a VATSIM ATC booking calendar) and the CMS's bookable positions, the only
 * place that talks to either. Our organization's bookings are read and written with our API key
 * (`VATSIM_BOOKING_API_KEY`) at our own base URL (`VATSIM_BOOKING_API_URL`, including `/api`).
 *
 * Reads are kept for a short while (`FRESH_MS`) so pages don't spend the booking system's rate
 * limit (100 requests per 15 minutes per address), and when it can't be reached the last good copy
 * is served for up to `KEEP_MS`. A write waits for the booking system's answer and then drops the
 * kept list, so the booker sees their change on the next page load. When the booking system turns a
 * write down (overlap, not eligible, bad times), it throws `BookingRefusedError` with its reason.
 */

/** The booking system said no, and will keep saying no: its reason is fit to show the booker. */
export class BookingRefusedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookingRefusedError';
	}
}

/** How long a read is served without asking again. */
export const FRESH_MS = 30_000;
/** How long the last good read is served while its source is failing. */
export const KEEP_MS = 60 * 60_000;
/** How long one request may take. */
export const TIMEOUT_MS = 10_000;

/** Where the CMS serves its public positions feed (no token needed). */
export const POSITIONS_PATH = '/api/public/v1/positions';

const ORG_BOOKINGS = '/org/bookings';

/** A read as it was fetched, and when. */
export type KeptRead = { fetchedAt: number; body: unknown };

/** Where reads are kept. The Workers Cache API on Cloudflare, memory in tests and `vite dev`. */
export type ReadStore = {
	get(key: string): Promise<KeptRead | undefined>;
	put(key: string, read: KeptRead): Promise<void>;
	delete(key: string): Promise<void>;
};

export type BookingsApiOptions = {
	/** The booking system's base URL, including `/api`. */
	baseUrl: string;
	apiKey: string;
	/** The CMS's origin, for the positions feed. */
	cmsUrl: string;
	store: ReadStore;
	fetch?: typeof fetch;
	now?: () => number;
};

type Wire = Record<string, unknown>;

/** The booking system's own words for a failure: its message plus any field errors. */
function describe(status: number, body: Wire | null) {
	const message = typeof body?.message === 'string' ? body.message : `HTTP ${status}`;
	const errors = body?.errors;
	if (errors && typeof errors === 'object') {
		const fields = Object.entries(errors as Record<string, unknown>)
			.map(([field, list]) => `${field}: ${Array.isArray(list) ? list.join('; ') : String(list)}`)
			.join(' | ');
		if (fields) return `${message} (${fields})`;
	}
	return message;
}

// The change feed calls training sessions "mentoring"
function bookingType(value: unknown): BookingType {
	if (value === 'mentoring') return 'training';
	if (value === 'event' || value === 'exam' || value === 'training') return value;
	return 'booking';
}

function fromWire(w: Wire): AtcBooking {
	return {
		id: Number(w.id),
		externalId: typeof w.externalId === 'string' ? w.externalId : null,
		cid: Number(w.cid),
		callsign: String(w.callsign),
		type: bookingType(w.type),
		start: formatBookingTime(new Date(String(w.start))),
		end: formatBookingTime(new Date(String(w.end)))
	};
}

/** The CMS feed (a bare array) as bookable positions, retired ones left out. */
export function fromCmsPositions(feed: unknown): CmsPosition[] {
	if (!Array.isArray(feed)) throw new Error('The CMS positions feed was not a list');
	return (feed as Wire[])
		.filter((p) => p.retired !== true)
		.map((p) => {
			const facility = (p.facility ?? {}) as Wire;
			const parent = facility.parent as Wire | null | undefined;
			return {
				callsign: String(p.callsign),
				name: String(p.name),
				radioName: String(p.radioName),
				frequency: Number(p.frequency),
				starred: p.starred === true,
				facility: {
					id: String(facility.id),
					name: String(facility.name),
					parent: parent ? { id: String(parent.id), name: String(parent.name) } : null
				},
				requiredCredentials: (Array.isArray(p.requiredCredentials)
					? (p.requiredCredentials as Wire[])
					: []
				).map((c) => ({ anyOf: Array.isArray(c.anyOf) ? c.anyOf.map(String) : [] }))
			};
		});
}

export function createBookingsApi(options: BookingsApiOptions): BookingsClient {
	const { store } = options;
	const fetchImpl = options.fetch ?? fetch;
	const now = options.now ?? Date.now;
	const base = options.baseUrl.replace(/\/+$/, '');
	const external = (id: string) => `/bookings/external/${encodeURIComponent(id)}`;

	/**
	 * One request to the booking system, returning its `data`. 404 comes back as `null` for the
	 * caller to decide on; a refusal throws `BookingRefusedError`; anything else (rate limit, bad
	 * key, outage, timeout) throws a plain Error.
	 */
	async function call(method: string, path: string, body?: unknown): Promise<unknown> {
		const response = await fetchImpl(`${base}${path}`, {
			method,
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${options.apiKey}`,
				...(body === undefined ? {} : { 'Content-Type': 'application/json' })
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (response.status === 204) return null;

		const json = (await response.json().catch(() => null)) as Wire | null;
		if (response.ok && json && json.success !== false) return json.data ?? null;

		const message = describe(response.status, json);
		if (response.status === 404) return null;
		// Our key, their limits or their outage: not the request's fault
		if ([401, 403, 408, 429].includes(response.status) || response.status >= 500 || response.ok) {
			throw new Error(`The booking system answered ${response.status}: ${message}`);
		}
		throw new BookingRefusedError(message);
	}

	/** A kept read while fresh; else a new one, or the last good one while the source is failing. */
	async function kept<T>(key: string, load: () => Promise<unknown>, parse: (body: unknown) => T) {
		const copy = await store.get(key).catch(() => undefined);
		const age = copy ? now() - copy.fetchedAt : Infinity;
		if (copy && age < FRESH_MS) return parse(copy.body);

		try {
			const body = await load();
			const parsed = parse(body);
			await store.put(key, { fetchedAt: now(), body }).catch((error) => {
				logger.error(`Keeping a copy of ${key} failed`, error);
			});
			return parsed;
		} catch (error) {
			if (copy && age < KEEP_MS) {
				logger.warn(`Reading ${key} failed; serving the kept copy`, error);
				return parse(copy.body);
			}
			throw error;
		}
	}

	// After a write the kept list is stale; the next read asks again
	const written = () => store.delete(ORG_BOOKINGS).catch(() => {});

	return {
		listOrgBookings: () =>
			kept(
				ORG_BOOKINGS,
				() => call('GET', ORG_BOOKINGS),
				(body) => (Array.isArray(body) ? (body as Wire[]).map(fromWire) : [])
			),

		getPositions: () =>
			kept(
				POSITIONS_PATH,
				async () => {
					const response = await fetchImpl(new URL(POSITIONS_PATH, options.cmsUrl), {
						headers: { Accept: 'application/json' },
						signal: AbortSignal.timeout(TIMEOUT_MS)
					});
					if (!response.ok) throw new Error(`The CMS answered ${response.status}`);
					return response.json();
				},
				fromCmsPositions
			),

		async createBooking(booking: NewBooking) {
			await call('POST', '/bookings/external', {
				externalId: booking.externalId,
				cid: String(booking.cid),
				callsign: booking.callsign,
				type: booking.type ?? 'booking',
				start: booking.start.toISOString(),
				end: booking.end.toISOString()
			});
			await written();
		},

		async updateBooking({ externalId, start, end }) {
			const patch = {
				...(start ? { start: start.toISOString() } : {}),
				...(end ? { end: end.toISOString() } : {})
			};
			const found = await call('PUT', external(externalId), patch);
			await written();
			if (found === null) throw new BookingRefusedError('That booking no longer exists');
		},

		// A booking that is already gone counts as cancelled
		async cancelBooking({ externalId }) {
			await call('DELETE', external(externalId));
			await written();
		}
	};
}

/**
 * The client from the site's settings, or undefined when either is missing, in which case bookings
 * show as empty and booking is off.
 */
export function bookingsApiFromEnv(
	env: Record<string, string | undefined>,
	store: ReadStore
): BookingsClient | undefined {
	const baseUrl = env.VATSIM_BOOKING_API_URL;
	const apiKey = env.VATSIM_BOOKING_API_KEY;
	if (!baseUrl || !apiKey) return undefined;
	return createBookingsApi({
		baseUrl,
		apiKey,
		cmsUrl: env.CMS_URL ?? 'https://cms.flyindycenter.com',
		store
	});
}

/** Reads kept in memory: for tests, and for `vite dev`, whose Cache API keeps nothing. */
export function memoryReadStore(): ReadStore {
	const reads = new Map<string, KeptRead>();
	return {
		async get(key) {
			return reads.get(key);
		},
		async put(key, read) {
			reads.set(key, read);
		},
		async delete(key) {
			reads.delete(key);
		}
	};
}

/**
 * Reads kept in the Workers Cache API, so every isolate in a data centre shares them. The host is
 * invented, so no request from outside can ever be served one. Whether a read is fresh is decided
 * from its own `fetchedAt`, which is what lets a stale one be served while the source is failing.
 */
export function cacheApiReadStore(cache: Cache): ReadStore {
	const keyFor = (key: string) => `https://community-website-bookings.internal${key}`;
	return {
		async get(key) {
			const response = await cache.match(keyFor(key));
			return response ? ((await response.json()) as KeptRead) : undefined;
		},
		async put(key, read) {
			await cache.put(
				keyFor(key),
				new Response(JSON.stringify(read), {
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': `max-age=${KEEP_MS / 1000}`
					}
				})
			);
		},
		async delete(key) {
			await cache.delete(keyFor(key));
		}
	};
}
