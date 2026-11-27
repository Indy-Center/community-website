import { and, eq } from 'drizzle-orm';
import {
	eventBookingProblemsTable,
	eventPositionsTable,
	type Event,
	type EventBookingProblem
} from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient';
import type { BookingsClient } from '$lib/types/bookings';
import { EVENT_BOOKING_PREFIX, getPositionCallsigns } from '$lib/utils/bookings';

// Keeps event rosters on the booking calendar: a controller who holds an event position is booked
// on its callsign, as an event booking, for the event's hours. A roster only holds positions once
// it is out: an open roster when the event is published, an assigned one when its manager
// publishes the roster. A booking the booking system refuses or can't take never fails the event
// action that triggered it: it's logged, and kept as a problem the events team sees on the event
// (see readBookingProblems) to pass on to the tech team.

type Held = Pick<Event, 'isPublished' | 'isRosterPublished' | 'rosterType' | 'endTime'>;

// Whether the event's assigned controllers should be on the calendar
export const holdsBookings = (event: Held, now = new Date()) =>
	event.isPublished &&
	event.isRosterPublished &&
	event.rosterType !== 'none' &&
	event.endTime > now;

// Our ID for one controller on one event position: ev_<event id>_<hash>, within the booking system's 64
// characters. The event ID stays readable so /bookings can group by event; the hash covers the
// position and CID, so putting someone else on the position is a cancel and a new booking.
export async function eventBookingId(eventId: string, positionId: string, cid: string) {
	const bytes = new TextEncoder().encode(`${eventId}:${positionId}:${cid}`);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	const hex = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${EVENT_BOOKING_PREFIX}${eventId}_${hex.slice(0, 16)}`;
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

async function callsignOf(positionId: string): Promise<string | undefined> {
	const { facility } = await fetchArtccInformation();
	return getPositionCallsigns(facility)[positionId];
}

type Action = EventBookingProblem['action'];

/**
 * Runs one position's booking work. Success clears any problem kept for that position and
 * controller; failure is logged and kept as a problem. Never throws.
 */
async function attempt(
	db: Database,
	eventId: string,
	{ positionId, cid }: Assigned,
	action: Action,
	work: () => Promise<unknown>
) {
	const thisOne = and(
		eq(eventBookingProblemsTable.eventId, eventId),
		eq(eventBookingProblemsTable.positionId, positionId),
		eq(eventBookingProblemsTable.cid, cid)
	);
	try {
		await work();
		await db.delete(eventBookingProblemsTable).where(thisOne);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Could not ${action} event booking ${positionId} for ${cid} on ${eventId}`, {
			error
		});
		try {
			const callsign = (await callsignOf(positionId).catch(() => undefined)) ?? null;
			await db.delete(eventBookingProblemsTable).where(thisOne);
			await db.insert(eventBookingProblemsTable).values({
				id: crypto.randomUUID(),
				eventId,
				positionId,
				callsign,
				cid,
				action,
				message,
				createdAt: new Date()
			});
		} catch (saveError) {
			logger.error(`Could not keep the booking problem for ${positionId} on ${eventId}`, {
				error: saveError
			});
		}
	}
}

async function book(client: BookingsClient, event: Event, { positionId, cid }: Assigned) {
	const callsign = await callsignOf(positionId);
	if (!callsign) throw new Error("vNAS lists no callsign for this position, so it can't be booked");

	await client.createBooking({
		externalId: await eventBookingId(event.id, positionId, cid),
		cid: Number(cid),
		callsign,
		type: 'event',
		start: event.startTime,
		end: event.endTime
	});
}

const cancel = async (client: BookingsClient, eventId: string, { positionId, cid }: Assigned) =>
	client.cancelBooking({ externalId: await eventBookingId(eventId, positionId, cid) });

const reschedule = async (client: BookingsClient, event: Event, { positionId, cid }: Assigned) =>
	client.updateBooking({
		externalId: await eventBookingId(event.id, positionId, cid),
		start: event.startTime,
		end: event.endTime
	});

/**
 * A controller was put on, or taken off, one position. `previousUserId` held it before, `userId`
 * holds it now; either may be null. Does nothing unless the event's roster is out.
 */
export async function syncAssignment(
	client: BookingsClient | undefined,
	db: Database,
	event: Event,
	positionId: string,
	{ previousUserId, userId }: { previousUserId?: string | null; userId?: string | null }
) {
	if (!client || !holdsBookings(event) || previousUserId === userId) return;

	await safely(`position ${positionId} of ${event.id}`, async () => {
		const [previous, next] = await Promise.all([cidOf(db, previousUserId), cidOf(db, userId)]);
		if (previous) {
			const held = { positionId, cid: previous };
			await attempt(db, event.id, held, 'cancel', () => cancel(client, event.id, held));
		}
		if (next) {
			const held = { positionId, cid: next };
			await attempt(db, event.id, held, 'book', () => book(client, event, held));
		}
	});
}

/**
 * The event itself changed (published, roster published or hidden, or new hours). Compares the event
 * as it was with how it is now, and books everyone, cancels everyone, or moves everyone's hours.
 */
export async function syncEvent(
	client: BookingsClient | undefined,
	db: Database,
	before: Event,
	after: Event
) {
	if (!client) return;

	const wasHolding = holdsBookings(before);
	const nowHolding = holdsBookings(after);
	const moved =
		before.startTime.getTime() !== after.startTime.getTime() ||
		before.endTime.getTime() !== after.endTime.getTime();
	if (!wasHolding && !nowHolding) return;
	if (wasHolding && nowHolding && !moved) return;

	await safely(`event ${after.id}`, async () => {
		const assigned = await assignedPositions(db, after.id);

		// Each position on its own, so one refusal doesn't stop the rest
		for (const position of assigned) {
			if (!nowHolding) {
				await attempt(db, after.id, position, 'cancel', () => cancel(client, after.id, position));
			} else if (!wasHolding) {
				await attempt(db, after.id, position, 'book', () => book(client, after, position));
			} else {
				await attempt(db, after.id, position, 'move', () => reschedule(client, after, position));
			}
		}
	});
}

// An event is about to be deleted: take everyone off the calendar first
export async function cancelEvent(client: BookingsClient | undefined, db: Database, event: Event) {
	if (!client || !holdsBookings(event)) return;

	await safely(`deleting event ${event.id}`, async () => {
		for (const position of await assignedPositions(db, event.id)) {
			await attempt(db, event.id, position, 'cancel', () => cancel(client, event.id, position));
		}
	});
}

/** The booking problems kept for an event, oldest first, for its managers to see. */
export const readBookingProblems = (db: Database, eventId: string) =>
	db.query.eventBookingProblemsTable.findMany({
		where: eq(eventBookingProblemsTable.eventId, eventId),
		orderBy: (problems, { asc }) => [asc(problems.createdAt)]
	});

/** Clears an event's booking problems: a manager dismissed them, or the event is gone. */
export const clearBookingProblems = (db: Database, eventId: string) =>
	db.delete(eventBookingProblemsTable).where(eq(eventBookingProblemsTable.eventId, eventId));
