import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { eventPositionsTable, eventsTable, type Event } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { seedMember, testDb } from '$lib/testing/db';
import type { BookingsWorker } from '$lib/types/bookings';
import { eventIdOf } from '$lib/utils/bookings';
import {
	cancelEvent,
	eventBookingId,
	holdsBookings,
	syncAssignment,
	syncEvent
} from './eventBookings';

vi.mock('$lib/server/vatsim/vnasDataClient', () => ({
	fetchArtccInformation: async () => ({
		facility: {
			id: 'ZID',
			positions: [],
			childFacilities: [
				{
					id: 'IND',
					childFacilities: [],
					positions: [
						{ id: 'pos-twr', callsign: 'IND_TWR' },
						{ id: 'pos-gnd', callsign: 'IND_GND' }
					]
				}
			]
		}
	})
}));

const HOUR = 3600000;
const EVENT_ID = 'event-1';

function stubWorker() {
	return {
		listOrgBookings: vi.fn(async () => []),
		getPositions: vi.fn(async () => []),
		createBooking: vi.fn(async () => {}),
		updateBooking: vi.fn(async () => {}),
		cancelBooking: vi.fn(async () => {})
	} satisfies BookingsWorker;
}

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jane',
		lastName: 'Doe',
		user: { id: 'user-jane', email: 'jane@private.example.test' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Alex',
		lastName: 'Sample',
		user: { id: 'user-alex', email: 'alex@private.example.test' }
	});
});

async function makeEvent(
	overrides: Partial<Event> = {},
	positions: Record<string, string | null> = {}
) {
	const values = {
		id: EVENT_ID,
		name: 'Example Fly-In',
		type: 'home',
		rosterType: 'open' as const,
		description: 'A made-up event.',
		startTime: new Date(Date.now() + 48 * HOUR),
		endTime: new Date(Date.now() + 51 * HOUR),
		isPublished: true,
		isRosterPublished: true,
		...overrides
	};
	await db.insert(eventsTable).values(values);
	for (const [position, userId] of Object.entries(positions)) {
		await db.insert(eventPositionsTable).values({ eventId: EVENT_ID, position, userId });
	}
	return (await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, EVENT_ID) }))!;
}

const reload = async () =>
	(await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, EVENT_ID) }))!;

describe('eventBookingId', () => {
	it('fits the Worker’s 64 characters, names its event, and differs by controller', async () => {
		const eventId = crypto.randomUUID();
		const id = await eventBookingId(eventId, '01GFTXMTZDDJ9XKMJ7AX0EXKQF', '1000001');

		expect(id.length).toBeLessThanOrEqual(64);
		expect(id).toMatch(/^ev_.+_[0-9a-f]{16}$/);
		expect(eventIdOf(id)).toBe(eventId);
		expect(await eventBookingId('e', 'p', '1000001')).not.toBe(
			await eventBookingId('e', 'p', '1000002')
		);
		expect(await eventBookingId('e', 'p', '1000001')).toBe(
			await eventBookingId('e', 'p', '1000001')
		);
	});
});

describe('holdsBookings', () => {
	const event = (overrides: Partial<Event>) =>
		({
			isPublished: true,
			isRosterPublished: true,
			rosterType: 'open',
			endTime: new Date(Date.now() + HOUR),
			...overrides
		}) as Event;

	it('needs a published event with a published roster that has not ended', () => {
		expect(holdsBookings(event({}))).toBe(true);
		expect(holdsBookings(event({ isPublished: false }))).toBe(false);
		expect(holdsBookings(event({ isRosterPublished: false }))).toBe(false);
		expect(holdsBookings(event({ rosterType: 'none' }))).toBe(false);
		expect(holdsBookings(event({ endTime: new Date(Date.now() - HOUR) }))).toBe(false);
	});
});

describe('syncAssignment', () => {
	it('books someone who signs up for a position, as an event on its callsign', async () => {
		const worker = stubWorker();
		const event = await makeEvent({}, { 'pos-twr': 'user-jane' });

		await syncAssignment(worker, db, event, 'pos-twr', {
			previousUserId: null,
			userId: 'user-jane'
		});

		expect(worker.createBooking).toHaveBeenCalledOnce();
		expect(worker.createBooking).toHaveBeenCalledWith({
			externalId: await eventBookingId(EVENT_ID, 'pos-twr', '1000001'),
			cid: 1000001,
			callsign: 'IND_TWR',
			type: 'event',
			start: event.startTime,
			end: event.endTime
		});
	});

	it('cancels the old booking and books the new person when a position changes hands', async () => {
		const worker = stubWorker();
		const event = await makeEvent({}, { 'pos-twr': 'user-alex' });

		await syncAssignment(worker, db, event, 'pos-twr', {
			previousUserId: 'user-jane',
			userId: 'user-alex'
		});

		expect(worker.cancelBooking).toHaveBeenCalledWith({
			externalId: await eventBookingId(EVENT_ID, 'pos-twr', '1000001')
		});
		expect(worker.createBooking).toHaveBeenCalledWith(
			expect.objectContaining({ cid: 1000002, callsign: 'IND_TWR' })
		);
	});

	it('cancels the booking when someone gives a position up', async () => {
		const worker = stubWorker();
		const event = await makeEvent({}, { 'pos-twr': null });

		await syncAssignment(worker, db, event, 'pos-twr', {
			previousUserId: 'user-jane',
			userId: null
		});

		expect(worker.cancelBooking).toHaveBeenCalledOnce();
		expect(worker.createBooking).not.toHaveBeenCalled();
	});

	it('does nothing while the roster is not out, or when no one changed', async () => {
		const worker = stubWorker();
		const draft = await makeEvent({ rosterType: 'assigned', isRosterPublished: false });

		await syncAssignment(worker, db, draft, 'pos-twr', { userId: 'user-jane' });
		await syncAssignment(worker, db, { ...draft, isRosterPublished: true }, 'pos-twr', {
			previousUserId: 'user-jane',
			userId: 'user-jane'
		});

		expect(worker.createBooking).not.toHaveBeenCalled();
		expect(worker.cancelBooking).not.toHaveBeenCalled();
	});

	it('skips a position vNAS has no callsign for, without failing', async () => {
		const worker = stubWorker();
		const event = await makeEvent({}, { 'pos-gone': 'user-jane' });

		await syncAssignment(worker, db, event, 'pos-gone', { userId: 'user-jane' });

		expect(worker.createBooking).not.toHaveBeenCalled();
	});

	it('does not fail the caller when the Worker does, and works without a Worker', async () => {
		const worker = stubWorker();
		worker.createBooking.mockRejectedValue(new Error('binding down'));
		const event = await makeEvent({}, { 'pos-twr': 'user-jane' });

		await expect(
			syncAssignment(worker, db, event, 'pos-twr', { userId: 'user-jane' })
		).resolves.toBeUndefined();
		await expect(
			syncAssignment(undefined, db, event, 'pos-twr', { userId: 'user-jane' })
		).resolves.toBeUndefined();
	});
});

describe('syncEvent', () => {
	it('books the whole assigned roster when its manager publishes it', async () => {
		const worker = stubWorker();
		const before = await makeEvent(
			{ rosterType: 'assigned', isRosterPublished: false },
			{ 'pos-twr': 'user-jane', 'pos-gnd': 'user-alex' }
		);
		await db
			.update(eventsTable)
			.set({ isRosterPublished: true })
			.where(eq(eventsTable.id, EVENT_ID));

		await syncEvent(worker, db, before, await reload());

		expect(worker.createBooking).toHaveBeenCalledTimes(2);
		expect(
			(
				worker.createBooking.mock.calls as unknown as [
					{ cid: number; callsign: string; type: string }
				][]
			)
				.map(([b]) => [b.cid, b.callsign, b.type])
				.sort()
		).toEqual([
			[1000001, 'IND_TWR', 'event'],
			[1000002, 'IND_GND', 'event']
		]);
	});

	it('takes the roster off the calendar when it is hidden or the event unpublished', async () => {
		const worker = stubWorker();
		const before = await makeEvent({}, { 'pos-twr': 'user-jane', 'pos-gnd': null });
		await db.update(eventsTable).set({ isPublished: false }).where(eq(eventsTable.id, EVENT_ID));

		await syncEvent(worker, db, before, await reload());

		expect(worker.cancelBooking).toHaveBeenCalledTimes(1);
		expect(worker.createBooking).not.toHaveBeenCalled();
	});

	it('moves everyone’s hours when the event is rescheduled, and not otherwise', async () => {
		const worker = stubWorker();
		const before = await makeEvent({}, { 'pos-twr': 'user-jane' });

		await syncEvent(worker, db, before, before);
		expect(worker.updateBooking).not.toHaveBeenCalled();

		const start = new Date(before.startTime.getTime() + HOUR);
		await db.update(eventsTable).set({ startTime: start }).where(eq(eventsTable.id, EVENT_ID));
		await syncEvent(worker, db, before, await reload());

		expect(worker.updateBooking).toHaveBeenCalledWith({
			externalId: await eventBookingId(EVENT_ID, 'pos-twr', '1000001'),
			start: new Date(Math.floor(start.getTime() / 1000) * 1000),
			end: new Date(Math.floor(before.endTime.getTime() / 1000) * 1000)
		});
	});

	it('leaves drafts alone', async () => {
		const worker = stubWorker();
		const draft = await makeEvent({ isPublished: false }, { 'pos-twr': 'user-jane' });

		await syncEvent(worker, db, draft, { ...draft, name: 'Renamed' });

		expect(worker.createBooking).not.toHaveBeenCalled();
		expect(worker.cancelBooking).not.toHaveBeenCalled();
	});
});

describe('cancelEvent', () => {
	it('cancels every assigned controller before the event is deleted', async () => {
		const worker = stubWorker();
		const event = await makeEvent({}, { 'pos-twr': 'user-jane', 'pos-gnd': 'user-alex' });

		await cancelEvent(worker, db, event);

		expect(worker.cancelBooking).toHaveBeenCalledTimes(2);
	});
});
