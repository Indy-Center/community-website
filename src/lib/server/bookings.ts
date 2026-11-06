import type { AtcBooking, BookingsWorker, WorkerBooking } from '$lib/types/bookings';
import { formatBookingTime } from '$lib/utils/bookings';

// All booking traffic goes through the bookings Worker: it holds the booking system's API key,
// retries, and drops what the system refuses. Writes return once queued, so a refused booking
// never shows up here; it just doesn't appear in the list.

const fromWorker = (booking: WorkerBooking): AtcBooking => ({
	...booking,
	start: formatBookingTime(booking.start),
	end: formatBookingTime(booking.end)
});

export async function fetchBookings(worker: BookingsWorker) {
	return (await worker.listOrgBookings()).map(fromWorker);
}

// Our ID for the new booking, which is how it is updated and cancelled later
export async function createBooking(
	worker: BookingsWorker,
	booking: { cid: number; callsign: string; start: Date; end: Date }
) {
	const externalId = crypto.randomUUID();
	await worker.createBooking({ externalId, ...booking });
	return externalId;
}

export const updateBooking = (
	worker: BookingsWorker,
	externalId: string,
	change: { start: Date; end: Date }
) => worker.updateBooking({ externalId, ...change });

export const cancelBooking = (worker: BookingsWorker, externalId: string) =>
	worker.cancelBooking({ externalId });
