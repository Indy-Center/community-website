import { readKept, type ReadStore } from '$lib/server/keptReads';
import type { AtcBooking, BookingType, BookingsClient, NewBooking } from '$lib/types/bookings';
import { formatBookingTime } from '$lib/utils/bookings';

/**
 * The booking system (a VATSIM ATC booking calendar), the only place that talks to it. Our organization's bookings are read and written with our API key
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

const ORG_BOOKINGS = '/org/bookings';

export type BookingsApiOptions = {
	/** The booking system's base URL, including `/api`. */
	baseUrl: string;
	apiKey: string;
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

export function createBookingsApi(options: BookingsApiOptions): BookingsClient {
	const { store } = options;
	const fetchImpl = options.fetch ?? fetch;
	const now = options.now ?? Date.now;
	const base = options.baseUrl.replace(/\/+$/, '');
	const external = (id: string) => `/bookings/external/${encodeURIComponent(id)}`;
	const restriction = (id: string) => `/org/session/restrictions/${encodeURIComponent(id)}`;

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

	// After a write the kept list is stale; the next read asks again
	const written = () => store.delete(ORG_BOOKINGS).catch(() => {});

	return {
		listOrgBookings: () =>
			readKept({
				store,
				key: ORG_BOOKINGS,
				now,
				freshMs: FRESH_MS,
				keepMs: KEEP_MS,
				load: () => call('GET', ORG_BOOKINGS),
				parse: (body) => (Array.isArray(body) ? (body as Wire[]).map(fromWire) : [])
			}),

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
		},

		// The roster changes rarely and is read once per roster sync, so it isn't kept
		async listMembers() {
			const body = await call('GET', '/org/members');
			return (Array.isArray(body) ? (body as Wire[]) : []).map((w) => ({
				cid: Number(w.cid),
				rating: Number(w.rating),
				role: w.role === 'manager' ? ('manager' as const) : ('member' as const),
				isHome: w.isHome !== false,
				isMentor: w.isMentor === true
			}));
		},

		async replaceMembers(members) {
			await call('PUT', '/org/members', {
				members: members.map((m) => ({
					cid: String(m.cid),
					rating: m.rating,
					role: m.role,
					isHome: m.isHome,
					isMentor: m.isMentor
				})),
				prune: true
			});
		},

		async listEndorsements(restrictionId) {
			const body = await call('GET', `${restriction(restrictionId)}/endorsements`);
			if (body === null) throw new Error(`The booking system has no restriction ${restrictionId}`);
			return (Array.isArray(body) ? (body as Wire[]) : []).map((w) => ({
				id: String(w.id),
				cid: Number(w.cid)
			}));
		},

		// No duration: the endorsement lasts until it is revoked
		async grantEndorsement(restrictionId, cid) {
			const found = await call('POST', `${restriction(restrictionId)}/endorsements`, {
				cid: String(cid)
			});
			if (found === null) throw new Error(`The booking system has no restriction ${restrictionId}`);
		},

		// One that is already gone counts as revoked
		async revokeEndorsement(restrictionId, endorsementId) {
			await call(
				'DELETE',
				`${restriction(restrictionId)}/endorsements/${encodeURIComponent(endorsementId)}`
			);
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
	return createBookingsApi({ baseUrl, apiKey, store });
}

// The stores moved to keptReads; re-exported for the callers that build a client
export { cacheApiReadStore, memoryReadStore, type ReadStore } from '$lib/server/keptReads';
