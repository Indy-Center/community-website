import { eq } from 'drizzle-orm';
import { eventPositionsTable, type Event } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient';
import type { BookingsWorker } from '$lib/types/bookings';
import { EVENT_BOOKING_PREFIX, getPositionCallsigns } from '$lib/utils/bookings';

// Keeps event rosters on the booking calendar: a controller who holds an event position is booked
// on its callsign, as an event booking, for the event's hours. A roster only holds positions once
// it is out: an open roster when the event is published, an assigned one when its manager
// publishes the roster. Writes are queued by the bookings Worker, so nothing here waits for the
// booking system, and a failure is logged without failing the event action that triggered it.

type Held = Pick<Event, 'isPublished' | 'isRosterPublished' | 'rosterType' | 'endTime'>;

// Whether the event's assigned controllers should be on the calendar
export const holdsBookings = (event: Held, now = new Date()) =>
	event.isPublished &&
	event.isRosterPublished &&
	event.rosterType !== 'none' &&
	event.endTime > now;

// Our ID for one controller on one event position, within the Worker's 64 characters. It includes
// the CID, so putting someone else on the position is a cancel and a new booking.
export async function eventBookingId(eventId: string, positionId: string, cid: string) {
	const bytes = new TextEncoder().encode(`${eventId}:${positionId}:${cid}`);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	const hex = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${EVENT_BOOKING_PREFIX}${hex.slice(0, 40)}`;
}

type Assigned = { positionId: string; cid: string };

async function assignedPositions(db: Database, eventId: string): Promise<Assigned[]> {
	const positions = await db.query.eventPositionsTable.findMany({
		where: eq(eventPositionsTable.eventId, eventId),
		with: { user: { columns: { cid: true } } }
	});

	return positions.flatMap((position) =>
		position.user ? [{ positionId: position.position, cid: position.user.cid }] : []
	);
}

async function cidOf(db: Database, userId: string | null | undefined) {
	if (!userId) return null;
	const user = await db.query.usersTable.findFirst({
		where: (users, { eq }) => eq(users.id, userId),
		columns: { cid: true }
	});
	return user?.cid ?? null;
}

// Each call below runs its work, and logs instead of throwing
async function safely(what: string, work: () => Promise<unknown>) {
	try {
		await work();
	} catch (error) {
		logger.error(`Could not update event bookings (${what})`, { error });
	}
}

async function callsignOf(positionId: string) {
	const { facility } = await fetchArtccInformation();
	const callsign = getPositionCallsigns(facility)[positionId];
	if (!callsign) logger.warn(`No callsign for event position ${positionId}; not booking it`);
	return callsign;
}

async function book(worker: BookingsWorker, event: Event, { positionId, cid }: Assigned) {
	const callsign = await callsignOf(positionId);
	if (!callsign) return;

	await worker.createBooking({
		externalId: await eventBookingId(event.id, positionId, cid),
		cid: Number(cid),
		callsign,
		type: 'event',
		start: event.startTime,
		end: event.endTime
	});
}

const cancel = async (worker: BookingsWorker, eventId: string, { positionId, cid }: Assigned) =>
	worker.cancelBooking({ externalId: await eventBookingId(eventId, positionId, cid) });

const reschedule = async (worker: BookingsWorker, event: Event, { positionId, cid }: Assigned) =>
	worker.updateBooking({
		externalId: await eventBookingId(event.id, positionId, cid),
		start: event.startTime,
		end: event.endTime
	});

/**
 * A controller was put on, or taken off, one position. `previousUserId` held it before, `userId`
 * holds it now; either may be null. Does nothing unless the event's roster is out.
 */
export async function syncAssignment(
	worker: BookingsWorker | undefined,
	db: Database,
	event: Event,
	positionId: string,
	{ previousUserId, userId }: { previousUserId?: string | null; userId?: string | null }
) {
	if (!worker || !holdsBookings(event) || previousUserId === userId) return;

	await safely(`position ${positionId} of ${event.id}`, async () => {
		const [previous, next] = await Promise.all([cidOf(db, previousUserId), cidOf(db, userId)]);
		if (previous) await cancel(worker, event.id, { positionId, cid: previous });
		if (next) await book(worker, event, { positionId, cid: next });
	});
}

/**
 * The event itself changed (published, roster published or hidden, or new hours). Compares the event
 * as it was with how it is now, and books everyone, cancels everyone, or moves everyone's hours.
 */
export async function syncEvent(
	worker: BookingsWorker | undefined,
	db: Database,
	before: Event,
	after: Event
) {
	if (!worker) return;

	const wasHolding = holdsBookings(before);
	const nowHolding = holdsBookings(after);
	const moved =
		before.startTime.getTime() !== after.startTime.getTime() ||
		before.endTime.getTime() !== after.endTime.getTime();
	if (!wasHolding && !nowHolding) return;
	if (wasHolding && nowHolding && !moved) return;

	await safely(`event ${after.id}`, async () => {
		const assigned = await assignedPositions(db, after.id);

		for (const position of assigned) {
			if (!nowHolding) await cancel(worker, after.id, position);
			else if (!wasHolding) await book(worker, after, position);
			else await reschedule(worker, after, position);
		}
	});
}

// An event is about to be deleted: take everyone off the calendar first
export async function cancelEvent(worker: BookingsWorker | undefined, db: Database, event: Event) {
	if (!worker || !holdsBookings(event)) return;

	await safely(`deleting event ${event.id}`, async () => {
		for (const position of await assignedPositions(db, event.id)) {
			await cancel(worker, event.id, position);
		}
	});
}
