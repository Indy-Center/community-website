import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pendingBookingsTable } from '$lib/db/schema/bookings';
import { eventsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { seedAvailableCredentials, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import type { BookingsWorker, WorkerBooking, WorkerPosition } from '$lib/types/bookings';
import { Role } from '$lib/utils/permissions';
import { actions, load } from './+page.server';

const HOUR = 3600000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR);

const position = (callsign: string, anyOf: string[]): WorkerPosition => ({
	callsign,
	name: callsign,
	radioName: `${callsign} radio`,
	frequency: 121600000,
	facility: { id: 'IND', name: 'Indianapolis', parent: null },
	requiredCredentials: anyOf.length > 0 ? [{ anyOf }] : []
});

const POSITIONS = [position('IND_GND', ['S-GC']), position('IND_APP', ['T-RC'])];

function stubWorker(listed: WorkerBooking[] = []) {
	return {
		listOrgBookings: vi.fn(async () => listed),
		getPositions: vi.fn(async () => POSITIONS),
		createBooking: vi.fn(async () => {}),
		updateBooking: vi.fn(async () => {}),
		cancelBooking: vi.fn(async () => {})
	} satisfies BookingsWorker;
}

const listed = (overrides: Partial<WorkerBooking>): WorkerBooking => ({
	id: 7,
	externalId: 'ext-7',
	cid: 1000001,
	callsign: 'IND_GND',
	type: 'booking',
	start: inHours(24),
	end: inHours(26),
	...overrides
});

const formRequest = (fields: Record<string, string>) => {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) body.set(key, value);
	return new Request('http://localhost/bookings', { method: 'POST', body });
};

const times = (startHours: number, endHours: number) => ({
	start: inHours(startHours).toISOString(),
	end: inHours(endHours).toISOString()
});

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedAvailableCredentials(db);
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Pat',
		lastName: 'Example',
		certification: 'S-GC',
		user: { id: 'user-pat', email: 'pat@private.example.test' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Robin',
		lastName: 'Sample',
		certification: 'S-GC',
		user: { id: 'user-robin', email: 'robin@private.example.test' }
	});
});

const asUser = (cid: string, roles: string[] = []) => ({
	db,
	roles,
	user: { cid, membership: 'controller' }
});

const call = (
	action: 'create' | 'update' | 'delete',
	worker: BookingsWorker | undefined,
	cid: string,
	fields: Record<string, string>,
	roles: string[] = []
) =>
	(actions[action] as (event: unknown) => Promise<any>)({
		request: formRequest(fields),
		locals: asUser(cid, roles),
		platform: { env: { BOOKINGS: worker } }
	});

describe('/bookings load', () => {
	it('offers only the positions the controller holds the credentials for', async () => {
		const data = await callLoad(load, {
			locals: asUser('1000001'),
			platform: { env: { BOOKINGS: stubWorker() } }
		});

		expect(data.bookablePositions.map((p) => p.callsign)).toEqual(['IND_GND']);
	});

	it('shows no bookings and disables booking without the worker binding', async () => {
		const data = await callLoad(load, {
			locals: asUser('1000001'),
			platform: { env: {} }
		});

		expect(data.bookings).toEqual([]);
		expect(data.bookingEnabled).toBe(false);
	});

	it("lets a member change their own bookings that have an externalId, and an admin anyone's", async () => {
		const worker = stubWorker([
			listed({ id: 1, externalId: 'mine', cid: 1000001 }),
			listed({ id: 2, externalId: 'theirs', cid: 1000002, callsign: 'IND_APP' }),
			listed({ id: 3, externalId: null, cid: 1000001, callsign: 'IND_APP' })
		]);
		const event = (locals: unknown) => ({ locals, platform: { env: { BOOKINGS: worker } } });

		expect((await callLoad(load, event(asUser('1000001')))).manageable).toEqual(['mine']);
		expect(
			(await callLoad(load, event(asUser('1000001', [Role.ADMIN])))).manageable.sort()
		).toEqual(['mine', 'theirs']);
	});

	it('leaves event bookings to their event: nobody changes them from here, admins included', async () => {
		const worker = stubWorker([
			listed({ id: 1, externalId: 'ev_0123456789abcdef', cid: 1000001, type: 'event' })
		]);

		const data = await callLoad(load, {
			locals: asUser('1000001', [Role.ADMIN]),
			platform: { env: { BOOKINGS: worker } }
		});

		expect(data.bookings).toHaveLength(1);
		expect(data.manageable).toEqual([]);
	});

	it('names the events that event bookings belong to, and nothing else about them', async () => {
		await db.insert(eventsTable).values({
			id: 'event-9',
			name: 'Never Dull',
			type: 'home',
			rosterType: 'open',
			description: 'A private description.',
			startTime: new Date(Date.now() + 24 * HOUR),
			endTime: new Date(Date.now() + 27 * HOUR),
			isPublished: true,
			isRosterPublished: true
		});
		const worker = stubWorker([
			listed({ id: 1, externalId: 'ev_event-9_0123456789abcdef', type: 'event' })
		]);

		const data = await callLoad(load, {
			locals: asUser('1000001'),
			platform: { env: { BOOKINGS: worker } }
		});

		expect(data.eventNames).toEqual({ 'event-9': 'Never Dull' });
		expect(JSON.stringify(data)).not.toContain('A private description');
	});

	it('shows a pending booking, and clears it once the list has it', async () => {
		const worker = stubWorker();
		const row = {
			externalId: 'pend-1',
			callsign: 'IND_GND',
			cid: '1000001',
			start: inHours(30),
			end: inHours(31),
			createdAt: new Date()
		};
		await db.insert(pendingBookingsTable).values(row);
		const event = { locals: asUser('1000001'), platform: { env: { BOOKINGS: worker } } };

		const before = await callLoad(load, event);
		expect(before.bookings.map((b) => [b.externalId, b.pending])).toEqual([['pend-1', true]]);
		expect(before.manageable).toEqual([]);

		worker.listOrgBookings.mockResolvedValue([
			listed({ id: 9, externalId: 'pend-1', start: row.start, end: row.end })
		]);
		const after = await callLoad(load, event);
		expect(after.bookings.map((b) => [b.externalId, b.pending])).toEqual([['pend-1', undefined]]);
		expect(await db.select().from(pendingBookingsTable)).toEqual([]);
	});
});

describe('/bookings names', () => {
	it('names bookers by the roster rule: a chosen preferred name, else first and last, privacy hiding the last', async () => {
		await seedMember(db, {
			cid: '1000003',
			firstName: 'Casey',
			lastName: 'Hidden',
			namePrivacy: true,
			user: { id: 'user-casey', email: 'casey@private.example.test' }
		});
		await seedMember(db, {
			cid: '1000004',
			firstName: 'Drew',
			lastName: 'Chosen',
			user: { id: 'user-drew', email: 'drew@private.example.test', preferredName: 'Dee' }
		});
		const worker = stubWorker([
			listed({ id: 1, externalId: 'a', cid: 1000001 }),
			listed({ id: 2, externalId: 'b', cid: 1000003, callsign: 'IND_APP' }),
			listed({ id: 3, externalId: 'c', cid: 1000004, callsign: 'IND_TWR' }),
			listed({ id: 4, externalId: 'd', cid: 1999999, callsign: 'IND_DEL' })
		]);

		const data = await callLoad(load, {
			locals: asUser('1000001'),
			platform: { env: { BOOKINGS: worker } }
		});

		expect(data.names).toEqual({
			'1000001': 'Pat Example',
			'1000003': 'Casey 1000003',
			'1000004': 'Dee'
		});
		expect(JSON.stringify(data)).not.toContain('Hidden');
	});
});

describe('/bookings create', () => {
	it('queues the booking with an externalId and holds the position', async () => {
		const worker = stubWorker();

		const result = await call('create', worker, '1000001', {
			callsign: 'IND_GND',
			...times(24, 26)
		});

		expect(result.form.valid).toBe(true);
		expect(worker.createBooking).toHaveBeenCalledOnce();
		const [sent] = worker.createBooking.mock.calls[0] as unknown as [
			{ externalId: string; cid: number; callsign: string }
		];
		expect(sent).toMatchObject({ cid: 1000001, callsign: 'IND_GND' });
		expect(sent.externalId).toMatch(/^[0-9a-f-]{36}$/);

		const rows = await db.select().from(pendingBookingsTable);
		expect(rows.map((r) => [r.externalId, r.callsign])).toEqual([[sent.externalId, 'IND_GND']]);
	});

	it('refuses a position that overlaps a pending booking, so nobody can double-book', async () => {
		const worker = stubWorker();
		await call('create', worker, '1000001', { callsign: 'IND_GND', ...times(24, 26) });

		const result = await call('create', worker, '1000002', {
			callsign: 'IND_GND',
			...times(25, 27)
		});

		expect(result.data.form.errors.callsign?.[0]).toMatch(/Already booked/);
		expect(worker.createBooking).toHaveBeenCalledOnce();
	});

	it('refuses a position the controller does not hold the credentials for', async () => {
		const worker = stubWorker();

		const result = await call('create', worker, '1000001', {
			callsign: 'IND_APP',
			...times(24, 26)
		});

		expect(result.data.form.errors.callsign?.[0]).toMatch(/aren't certified/);
		expect(worker.createBooking).not.toHaveBeenCalled();
	});

	it('releases the hold when the worker cannot queue the booking', async () => {
		const worker = stubWorker();
		worker.createBooking.mockRejectedValue(new Error('binding down'));

		const result = await call('create', worker, '1000001', {
			callsign: 'IND_GND',
			...times(24, 26)
		});

		expect(result.status).toBe(502);
		expect(await db.select().from(pendingBookingsTable)).toEqual([]);
	});

	it('is unavailable without the worker binding', async () => {
		const result = await call('create', undefined, '1000001', {
			callsign: 'IND_GND',
			...times(24, 26)
		});

		expect(result.status).toBe(503);
	});
});

describe('/bookings update and delete', () => {
	const mine = listed({ externalId: 'mine', cid: 1000001 });

	it('queues a change to the controller’s own booking', async () => {
		const worker = stubWorker([mine]);

		const result = await call('update', worker, '1000001', {
			externalId: 'mine',
			...times(30, 32)
		});

		expect(result.form.valid).toBe(true);
		expect(worker.updateBooking).toHaveBeenCalledWith({
			externalId: 'mine',
			start: expect.any(Date),
			end: expect.any(Date)
		});
	});

	it("refuses to change someone else's booking, but lets an admin", async () => {
		const worker = stubWorker([mine]);
		const fields = { externalId: 'mine', ...times(30, 32) };

		expect((await call('update', worker, '1000002', fields)).status).toBe(403);
		expect(worker.updateBooking).not.toHaveBeenCalled();

		await call('update', worker, '1000002', fields, [Role.ADMIN]);
		expect(worker.updateBooking).toHaveBeenCalledOnce();
	});

	it('cancels by externalId, for the owner or an admin only', async () => {
		const worker = stubWorker([mine]);

		expect((await call('delete', worker, '1000002', { externalId: 'mine' })).status).toBe(403);
		expect(worker.cancelBooking).not.toHaveBeenCalled();

		await call('delete', worker, '1000001', { externalId: 'mine' });
		await call('delete', worker, '1000002', { externalId: 'mine' }, [Role.ADMIN]);
		expect(worker.cancelBooking).toHaveBeenCalledTimes(2);
		expect(worker.cancelBooking).toHaveBeenCalledWith({ externalId: 'mine' });
	});

	it('cannot change a booking made outside this site', async () => {
		const worker = stubWorker([listed({ externalId: null, cid: 1000001 })]);

		const result = await call('delete', worker, '1000001', { externalId: '' }, [Role.ADMIN]);

		expect(result.status).toBe(403);
		expect(worker.cancelBooking).not.toHaveBeenCalled();
	});
});
