import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { cmsPosition, stubBookingsClient } from '$lib/testing/bookings';
import { seedAvailableCredentials, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { BookingRefusedError } from '$lib/server/bookingsApi';
import type { AtcBooking, BookingsClient, CmsPosition } from '$lib/types/bookings';
import { formatBookingTime } from '$lib/utils/bookings';
import { Role } from '$lib/utils/permissions';
import { actions, load } from './+page.server';

// Bookings are admins-only for now; most tests here cover how they work once open to everyone
const flags = vi.hoisted(() => ({ adminOnly: false }));
vi.mock('$lib/config/bookings', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/config/bookings')>()),
	get BOOKINGS_ADMIN_ONLY() {
		return flags.adminOnly;
	}
}));

const HOUR = 3600000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR);

const position = (callsign: string, anyOf: string[]): CmsPosition =>
	cmsPosition(callsign, { requiredCredentials: anyOf.length > 0 ? [{ anyOf }] : [] });

const POSITIONS = [position('AID_GND', ['S-GC']), position('IND_APP', ['T-RC'])];

const stubClient = (listed: AtcBooking[] = []) =>
	stubBookingsClient({ listed }) satisfies BookingsClient;

const listed = (overrides: Partial<AtcBooking>): AtcBooking => ({
	id: 7,
	externalId: 'ext-7',
	cid: 1000001,
	callsign: 'AID_GND',
	type: 'booking',
	start: formatBookingTime(inHours(24)),
	end: formatBookingTime(inHours(26)),
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
	flags.adminOnly = false;
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

// The catalogue's positions come from the root layout's reader, on locals
const asUser = (
	cid: string,
	roles: string[] = [],
	bookings?: BookingsClient,
	positions: CmsPosition[] = POSITIONS
) => ({
	db,
	roles,
	bookings,
	positions: async () => positions,
	user: { cid, membership: 'controller' }
});

const call = (
	action: 'create' | 'update' | 'delete',
	client: BookingsClient | undefined,
	cid: string,
	fields: Record<string, string>,
	roles: string[] = []
) =>
	(actions[action] as (event: unknown) => Promise<any>)({
		request: formRequest(fields),
		locals: asUser(cid, roles, client)
	});

describe('/bookings load', () => {
	it('offers only the positions the controller holds the credentials for', async () => {
		const data = await callLoad(load, {
			locals: asUser('1000001', [], stubClient())
		});

		expect(data.bookablePositions.map((p) => p.callsign)).toEqual(['AID_GND']);
	});

	it("shows no bookings and disables booking without the booking system's settings", async () => {
		const data = await callLoad(load, {
			locals: asUser('1000001')
		});

		expect(data.bookings).toEqual([]);
		expect(data.bookingEnabled).toBe(false);
	});

	it("lets a member change their own bookings that have an externalId, and an admin anyone's", async () => {
		const client = stubClient([
			listed({ id: 1, externalId: 'mine', cid: 1000001 }),
			listed({ id: 2, externalId: 'theirs', cid: 1000002, callsign: 'IND_APP' }),
			listed({ id: 3, externalId: null, cid: 1000001, callsign: 'IND_APP' })
		]);
		const event = (roles: string[]) => ({ locals: asUser('1000001', roles, client) });

		expect((await callLoad(load, event([]))).manageable).toEqual(['mine']);
		expect((await callLoad(load, event([Role.ADMIN]))).manageable.sort()).toEqual([
			'mine',
			'theirs'
		]);
	});

	it('leaves event bookings to their event: nobody changes them from here, admins included', async () => {
		const client = stubClient([
			listed({ id: 1, externalId: 'ev_0123456789abcdef', cid: 1000001, type: 'event' })
		]);

		const data = await callLoad(load, {
			locals: asUser('1000001', [Role.ADMIN], client)
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
		const client = stubClient([
			listed({ id: 1, externalId: 'ev_event-9_0123456789abcdef', type: 'event' })
		]);

		const data = await callLoad(load, {
			locals: asUser('1000001', [], client)
		});

		expect(data.eventNames).toEqual({ 'event-9': 'Never Dull' });
		expect(JSON.stringify(data)).not.toContain('A private description');
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
		const client = stubClient([
			listed({ id: 1, externalId: 'a', cid: 1000001 }),
			listed({ id: 2, externalId: 'b', cid: 1000003, callsign: 'IND_APP' }),
			listed({ id: 3, externalId: 'c', cid: 1000004, callsign: 'IND_TWR' }),
			listed({ id: 4, externalId: 'd', cid: 1999999, callsign: 'IND_DEL' })
		]);

		const data = await callLoad(load, {
			locals: asUser('1000001', [], client)
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
	it('books the position with an externalId of our own', async () => {
		const client = stubClient();

		const result = await call('create', client, '1000001', {
			callsign: 'AID_GND',
			...times(24, 26)
		});

		expect(result.form.valid).toBe(true);
		expect(result.form.message).toBe('Booked.');
		expect(client.createBooking).toHaveBeenCalledOnce();
		const [sent] = client.createBooking.mock.calls[0] as unknown as [
			{ externalId: string; cid: number; callsign: string }
		];
		expect(sent).toMatchObject({ cid: 1000001, callsign: 'AID_GND' });
		expect(sent.externalId).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('refuses a position that overlaps a listed booking, so nobody can double-book', async () => {
		const client = stubClient([listed({ callsign: 'AID_GND', cid: 1000001 })]);

		const result = await call('create', client, '1000002', {
			callsign: 'AID_GND',
			...times(25, 27)
		});

		expect(result.data.form.errors.callsign?.[0]).toMatch(/Already booked/);
		expect(client.createBooking).not.toHaveBeenCalled();
	});

	it('refuses a position the controller does not hold the credentials for', async () => {
		const client = stubClient();

		const result = await call('create', client, '1000001', {
			callsign: 'IND_APP',
			...times(24, 26)
		});

		expect(result.data.form.errors.callsign?.[0]).toMatch(/aren't certified/);
		expect(client.createBooking).not.toHaveBeenCalled();
	});

	it("passes on the booking system's reason when it refuses", async () => {
		const client = stubClient();
		client.createBooking.mockRejectedValue(new BookingRefusedError('Overlaps another booking'));

		const result = await call('create', client, '1000001', {
			callsign: 'AID_GND',
			...times(24, 26)
		});

		expect(result.status).toBe(400);
		expect(result.data.form.errors._errors?.[0]).toMatch(/Overlaps another booking/);
	});

	it('says booking is unavailable when the booking system cannot be reached', async () => {
		const client = stubClient();
		client.createBooking.mockRejectedValue(new Error('The booking system answered 503'));

		const result = await call('create', client, '1000001', {
			callsign: 'AID_GND',
			...times(24, 26)
		});

		expect(result.status).toBe(502);
		expect(result.data.form.errors._errors?.[0]).toMatch(/not available/);
	});

	it("is unavailable without the booking system's settings", async () => {
		const result = await call('create', undefined, '1000001', {
			callsign: 'AID_GND',
			...times(24, 26)
		});

		expect(result.status).toBe(503);
	});
});

describe('/bookings update and delete', () => {
	const mine = listed({ externalId: 'mine', cid: 1000001 });

	it('queues a change to the controller’s own booking', async () => {
		const client = stubClient([mine]);

		const result = await call('update', client, '1000001', {
			externalId: 'mine',
			...times(30, 32)
		});

		expect(result.form.valid).toBe(true);
		expect(client.updateBooking).toHaveBeenCalledWith({
			externalId: 'mine',
			start: expect.any(Date),
			end: expect.any(Date)
		});
	});

	it("refuses to change someone else's booking, but lets an admin", async () => {
		const client = stubClient([mine]);
		const fields = { externalId: 'mine', ...times(30, 32) };

		expect((await call('update', client, '1000002', fields)).status).toBe(403);
		expect(client.updateBooking).not.toHaveBeenCalled();

		await call('update', client, '1000002', fields, [Role.ADMIN]);
		expect(client.updateBooking).toHaveBeenCalledOnce();
	});

	it('cancels by externalId, for the owner or an admin only', async () => {
		const client = stubClient([mine]);

		expect((await call('delete', client, '1000002', { externalId: 'mine' })).status).toBe(403);
		expect(client.cancelBooking).not.toHaveBeenCalled();

		await call('delete', client, '1000001', { externalId: 'mine' });
		await call('delete', client, '1000002', { externalId: 'mine' }, [Role.ADMIN]);
		expect(client.cancelBooking).toHaveBeenCalledTimes(2);
		expect(client.cancelBooking).toHaveBeenCalledWith({ externalId: 'mine' });
	});

	it('cannot change a booking made outside this site', async () => {
		const client = stubClient([listed({ externalId: null, cid: 1000001 })]);

		const result = await call('delete', client, '1000001', { externalId: '' }, [Role.ADMIN]);

		expect(result.status).toBe(403);
		expect(client.cancelBooking).not.toHaveBeenCalled();
	});
});

describe('/bookings while admins only', () => {
	beforeEach(() => {
		flags.adminOnly = true;
	});

	it('sends everyone but admins home, signed out included', async () => {
		const redirectsHome = async (locals: unknown) => {
			const thrown = await Promise.resolve()
				.then(() => callLoad(load, { locals }))
				.catch((e) => e);
			expect(thrown).toMatchObject({ status: 302, location: '/' });
		};

		await redirectsHome(asUser('1000001', [], stubClient()));
		await redirectsHome({ db, roles: [], bookings: stubClient() });
	});

	it('shows admins the page', async () => {
		const data = await callLoad(load, { locals: asUser('1000001', [Role.ADMIN], stubClient()) });
		expect(data.loggedIn).toBe(true);
	});

	it('refuses every action from anyone but an admin', async () => {
		const client = stubClient([listed({ externalId: 'mine', cid: 1000001 })]);

		const created = await call('create', client, '1000001', {
			callsign: 'AID_GND',
			...times(30, 32)
		});
		const updated = await call('update', client, '1000001', {
			externalId: 'mine',
			...times(30, 32)
		});
		const deleted = await call('delete', client, '1000001', { externalId: 'mine' });

		expect([created.status, updated.status, deleted.status]).toEqual([403, 403, 403]);
		expect(client.createBooking).not.toHaveBeenCalled();
		expect(client.updateBooking).not.toHaveBeenCalled();
		expect(client.cancelBooking).not.toHaveBeenCalled();
	});
});

describe('/bookings certification rules (SOP, not the CMS)', () => {
	it('lets S-GC book ground at a simple field but not at an advanced one, whatever the CMS says', async () => {
		const catalogue = [position('AID_GND', ['A-GC']), position('IND_GND', ['S-GC'])];

		const data = await callLoad(load, {
			locals: asUser('1000001', [], stubClient(), catalogue)
		});

		expect(data.bookablePositions.map((p) => p.callsign)).toEqual(['AID_GND']);
	});

	it('never offers a position vNAS no longer lists', async () => {
		const catalogue = [position('AID_GND', []), cmsPosition('BAK_GND', { retired: true })];

		const data = await callLoad(load, {
			locals: asUser('1000001', [], stubClient(), catalogue)
		});

		expect(data.bookablePositions.map((p) => p.callsign)).toEqual(['AID_GND']);
	});
});

describe('/bookings mentors booking training', () => {
	// A mentor (VATUSA MTR), and a rostered student who has never signed in to the site
	beforeEach(async () => {
		await seedMember(db, {
			cid: '1000003',
			firstName: 'Morgan',
			lastName: 'Mentor',
			certification: 'S-GC',
			roles: ['MTR'],
			user: { id: 'user-morgan', email: 'morgan@private.example.test' }
		});
		await seedMember(db, { cid: '1000004', firstName: 'Sam', lastName: 'Student' });
	});

	it('offers mentors every other rostered controller as a student, by CID', async () => {
		const data = await callLoad(load, { locals: asUser('1000003', [], stubClient()) });

		expect(data.students.map((s) => [s.id, s.name])).toEqual([
			['1000001', 'Pat Example'],
			['1000002', 'Robin Sample'],
			['1000004', 'Sam Student']
		]);
	});

	it('offers nobody to a controller who does not mentor', async () => {
		const data = await callLoad(load, { locals: asUser('1000001', [], stubClient()) });
		expect(data.students).toEqual([]);
	});

	it("books the student's training, as a training booking under their CID", async () => {
		const client = stubClient();

		const result = await call('create', client, '1000003', {
			callsign: 'AID_GND',
			forCid: '1000004',
			...times(24, 26)
		});

		expect(result.form.message).toBe('Training booked.');
		expect(client.createBooking).toHaveBeenCalledWith(
			expect.objectContaining({ cid: 1000004, callsign: 'AID_GND', type: 'training' })
		);
	});

	it("checks the mentor's credentials, not the student's", async () => {
		const client = stubClient();

		const result = await call('create', client, '1000003', {
			callsign: 'IND_APP',
			forCid: '1000004',
			...times(24, 26)
		});

		expect(result.data.form.errors.callsign?.[0]).toMatch(/aren't certified/);
		expect(client.createBooking).not.toHaveBeenCalled();
	});

	it('refuses a controller who does not mentor booking for someone else', async () => {
		const client = stubClient();

		const result = await call('create', client, '1000001', {
			callsign: 'AID_GND',
			forCid: '1000002',
			...times(24, 26)
		});

		expect(result.status).toBe(403);
		expect(result.data.form.errors.forCid?.[0]).toMatch(/Only mentors/);
		expect(client.createBooking).not.toHaveBeenCalled();
	});

	it('refuses a student who is not on the roster', async () => {
		const result = await call('create', stubClient(), '1000003', {
			callsign: 'AID_GND',
			forCid: '1999999',
			...times(24, 26)
		});

		expect(result.data.form.errors.forCid?.[0]).toMatch(/not on the roster/);
	});

	it("lets mentors change any training booking, but not someone else's own booking", async () => {
		const client = stubClient([
			listed({ id: 1, externalId: 'training', cid: 1000004, type: 'training' }),
			listed({ id: 2, externalId: 'theirs', cid: 1000002, callsign: 'IND_APP' })
		]);

		const data = await callLoad(load, { locals: asUser('1000003', [], client) });
		expect(data.manageable).toEqual(['training']);

		await call('delete', client, '1000003', { externalId: 'training' });
		expect(client.cancelBooking).toHaveBeenCalledWith({ externalId: 'training' });
	});
});

describe('/bookings one controller, one position at a time', () => {
	it('refuses a booking that overlaps one of your own on another position', async () => {
		const client = stubClient([listed({ externalId: 'mine', cid: 1000001, callsign: 'IND_APP' })]);

		const result = await call('create', client, '1000001', {
			callsign: 'AID_GND',
			...times(25, 27)
		});

		expect(result.data.form.errors._errors?.[0]).toMatch(/You're already booked on IND_APP radio/);
		expect(client.createBooking).not.toHaveBeenCalled();
	});

	it('allows a booking that starts as your other one ends', async () => {
		const client = stubClient([listed({ externalId: 'mine', cid: 1000001, callsign: 'IND_APP' })]);

		await call('create', client, '1000001', { callsign: 'AID_GND', ...times(26, 28) });

		expect(client.createBooking).toHaveBeenCalledOnce();
	});

	it('refuses moving a booking onto the times of your other one', async () => {
		const client = stubClient([
			listed({ id: 1, externalId: 'first', cid: 1000001, callsign: 'IND_APP' }),
			listed({ id: 2, externalId: 'second', cid: 1000001, callsign: 'AID_GND', ...{} })
		]);
		// The second sits at 24–26h like the first; move it to 25–27h, still over the first
		const result = await call('update', client, '1000001', {
			externalId: 'second',
			...times(25, 27)
		});

		expect(result.data.form.errors._errors?.[0]).toMatch(/already booked on IND_APP radio/);
		expect(client.updateBooking).not.toHaveBeenCalled();
	});
});
