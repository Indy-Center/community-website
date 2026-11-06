import type { NumericRange } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { AtcBooking, BookingType } from '$lib/types/bookings';
import { FACILITY_ID } from '$lib/config';
import { logger } from '$lib/server/logger';
import { formatBookingTime, parseBookingTime } from '$lib/utils/bookings';

// A var in wrangler.jsonc, so a local mock or another deployment of the booking system can
// stand in
function baseUrl() {
	if (!env.ATC_BOOKINGS_API_URL) throw new Error('ATC_BOOKINGS_API_URL is not set');
	return env.ATC_BOOKINGS_API_URL;
}

// Callers use "YYYY-MM-DD HH:mm:ss" UTC times and numeric CIDs throughout; the API speaks
// ISO 8601 with string CIDs, so both are converted at this boundary
export type BookingRequest = {
	callsign: string;
	cid: number;
	type?: BookingType;
	start: string;
	end: string;
};

export type BookingResult =
	| { ok: true; booking?: AtcBooking }
	| { ok: false; status: NumericRange<400, 599>; message: string };

type ApiBooking = Omit<AtcBooking, 'cid' | 'start' | 'end'> & {
	cid: number | string;
	start: string;
	end: string;
};

const fromApi = (booking: ApiBooking): AtcBooking => ({
	...booking,
	cid: Number(booking.cid),
	start: formatBookingTime(new Date(booking.start)),
	end: formatBookingTime(new Date(booking.end))
});

const toIso = (time: string) => parseBookingTime(time).toISOString();

// Reading bookings is public; creating, updating and deleting need ATC_BOOKINGS_API_KEY.
// The API allows 100 requests per 15 minutes per address, so the list is narrowed to our
// subdivision rather than fetched whole.
export async function fetchBookings(subdivision: string = FACILITY_ID) {
	const response = await fetch(`${baseUrl()}/bookings?${new URLSearchParams({ subdivision })}`);
	if (!response.ok) {
		throw new Error(`Fetching bookings failed with ${response.status} ${response.statusText}`);
	}

	const { data } = (await response.json()) as { data: ApiBooking[] };
	return data.map(fromApi);
}

// The API documents no lookup by id, so this finds it in the list
export async function fetchBooking(id: number) {
	const bookings = await fetchBookings();
	return bookings.find((booking) => booking.id === id) ?? null;
}

export function hasBookingsApiKey() {
	return Boolean(env.ATC_BOOKINGS_API_KEY);
}

export function createBooking(booking: BookingRequest) {
	return send('POST', '/bookings', {
		...booking,
		cid: String(booking.cid),
		start: toIso(booking.start),
		end: toIso(booking.end)
	});
}

export function updateBooking(id: number, booking: Partial<BookingRequest>) {
	return send('PUT', `/bookings/${id}`, {
		...booking,
		...(booking.cid !== undefined ? { cid: String(booking.cid) } : {}),
		...(booking.start ? { start: toIso(booking.start) } : {}),
		...(booking.end ? { end: toIso(booking.end) } : {})
	});
}

export function deleteBooking(id: number) {
	return send('DELETE', `/bookings/${id}`);
}

async function send(method: string, path: string, body?: object): Promise<BookingResult> {
	if (!hasBookingsApiKey()) {
		return { ok: false, status: 503, message: 'Booking is not available yet.' };
	}

	const response = await fetch(`${baseUrl()}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${env.ATC_BOOKINGS_API_KEY}`,
			Accept: 'application/json',
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		body: body ? JSON.stringify(body) : undefined
	});

	if (response.ok) {
		if (response.status === 204) return { ok: true };

		const { data } = (await response.json().catch(() => ({}))) as { data?: ApiBooking };
		return { ok: true, booking: data?.id ? fromApi(data) : undefined };
	}

	if (response.status === 429) {
		logger.warn('ATC bookings API rate limit reached', { method, path });
		return {
			ok: false,
			status: 429,
			message: 'The booking system is busy right now. Please try again in a few minutes.'
		};
	}

	// Failures are { message, errors?: { field: [messages] } }; a 422's errors say more than its message
	const error = (await response.json().catch(() => ({}))) as {
		message?: unknown;
		errors?: Record<string, unknown>;
	};
	const details = Object.values(error.errors ?? {})
		.flat()
		.filter((detail): detail is string => typeof detail === 'string');
	const message =
		details.join(' ') ||
		(typeof error.message === 'string' ? error.message : '') ||
		response.statusText;

	logger.error('ATC bookings API request failed', {
		method,
		path,
		status: response.status,
		message
	});

	return { ok: false, status: response.status as NumericRange<400, 599>, message };
}
