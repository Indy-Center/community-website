import type { NumericRange } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { AtcBooking, BookingType } from '$lib/types/bookings';
import { logger } from '$lib/server/logger';

// Overridable so a local mock can stand in for the real API
const baseUrl = () => env.ATC_BOOKINGS_API_URL || 'https://atc-bookings.vatsim.net/api';

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

// Reading bookings is public; creating, updating and deleting need ATC_BOOKINGS_API_KEY
export async function fetchBookings() {
	const url = `${baseUrl()}/booking`;
	const response = await fetch(url).then((res) => res.json());

	return response as AtcBooking[];
}

export async function fetchBooking(id: number) {
	const response = await fetch(`${baseUrl()}/booking/${id}`);
	if (!response.ok) return null;

	return (await response.json()) as AtcBooking;
}

export function hasBookingsApiKey() {
	return Boolean(env.ATC_BOOKINGS_API_KEY);
}

export function createBooking(booking: BookingRequest) {
	return send('POST', '/booking', booking);
}

export function updateBooking(id: number, booking: Partial<BookingRequest>) {
	return send('PUT', `/booking/${id}`, booking);
}

export function deleteBooking(id: number) {
	return send('DELETE', `/booking/${id}`);
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
		return response.status === 204 ? { ok: true } : { ok: true, booking: await response.json() };
	}

	// 422 returns { field: [messages] }; everything else returns { message }
	const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	const message =
		typeof error.message === 'string'
			? error.message
			: Object.values(error).flat().filter(Boolean).join(' ') || response.statusText;

	logger.error('ATC bookings API request failed', {
		method,
		path,
		status: response.status,
		message
	});

	return { ok: false, status: response.status as NumericRange<400, 599>, message };
}
