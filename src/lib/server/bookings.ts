import { inArray } from 'drizzle-orm';
import { pendingBookingsTable } from '$lib/db/schema/bookings';
import type { Database } from '$lib/server/db';
import type { AtcBooking, BookingsWorker, WorkerBooking } from '$lib/types/bookings';
import { formatBookingTime, mergePendingBookings } from '$lib/utils/bookings';

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

// The list plus bookings we sent that it doesn't show yet, so a position stays held until the list
// catches up. Rows that are now listed, or too old (the booking system refused them), are removed.
export async function fetchBookingsWithPending(worker: BookingsWorker, db: Database) {
	const [bookings, rows] = await Promise.all([
		fetchBookings(worker),
		db.select().from(pendingBookingsTable)
	]);

	const { bookings: merged, doneIds } = mergePendingBookings(
		bookings,
		rows.map((row) => ({ ...row })),
		new Date()
	);
	if (doneIds.length > 0) {
		await db.delete(pendingBookingsTable).where(inArray(pendingBookingsTable.externalId, doneIds));
	}

	return merged;
}

// Holds the position, then queues the booking with our own ID (how it is updated and cancelled
// later); if queueing fails the hold is released
export async function createBooking(
	worker: BookingsWorker,
	db: Database,
	booking: { cid: number; callsign: string; start: Date; end: Date }
) {
	const externalId = crypto.randomUUID();
	await db.insert(pendingBookingsTable).values({
		externalId,
		callsign: booking.callsign,
		cid: String(booking.cid),
		start: booking.start,
		end: booking.end,
		createdAt: new Date()
	});

	try {
		await worker.createBooking({ externalId, ...booking });
	} catch (error) {
		await db
			.delete(pendingBookingsTable)
			.where(inArray(pendingBookingsTable.externalId, [externalId]));
		throw error;
	}
	return externalId;
}

export const updateBooking = (
	worker: BookingsWorker,
	externalId: string,
	change: { start: Date; end: Date }
) => worker.updateBooking({ externalId, ...change });

export const cancelBooking = (worker: BookingsWorker, externalId: string) =>
	worker.cancelBooking({ externalId });
