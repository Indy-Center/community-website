import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { stubBookingsClient } from '$lib/testing/bookings';
import { seedMember, testDb } from '$lib/testing/db';
import { syncBookingSystem } from './bookingRoster';

const vatusa = vi.hoisted(() => ({ home: vi.fn() }));
vi.mock('$lib/server/vatsim/vatusaDataClient', () => ({ fetchRoster: vatusa.home }));

const RESTRICTION = 'restriction-1';
let db: Database;

// Every member here is made up; the repository is public.
beforeEach(async () => {
	db = await testDb();
	vatusa.home.mockReset().mockResolvedValue([{ cid: 1000001 }]);
	// A home controller holding T2, and a visiting mentor without it
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Pat',
		lastName: 'Example',
		rating: 'C1',
		endorsements: ['T2-CTR']
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Robin',
		lastName: 'Sample',
		rating: 'S3',
		roles: ['MTR']
	});
});

const inSync = [
	{ cid: 1000001, rating: 5, role: 'member' as const, isHome: true, isMentor: false },
	{ cid: 1000002, rating: 4, role: 'member' as const, isHome: false, isMentor: true }
];

describe('syncBookingSystem roster', () => {
	it('sends every rostered controller, home and visiting, with every field', async () => {
		const client = stubBookingsClient();

		await syncBookingSystem(client, db, RESTRICTION);

		expect(vatusa.home).toHaveBeenCalledWith('home');
		expect(client.replaceMembers).toHaveBeenCalledWith(inSync);
	});

	it('writes nothing when the booking system already matches', async () => {
		const client = stubBookingsClient({
			members: inSync,
			endorsements: [{ id: 'e1', cid: 1000001 }]
		});

		await syncBookingSystem(client, db, RESTRICTION);

		expect(client.replaceMembers).not.toHaveBeenCalled();
		expect(client.grantEndorsement).not.toHaveBeenCalled();
		expect(client.revokeEndorsement).not.toHaveBeenCalled();
	});

	it('leaves the roster alone when VATUSA cannot say who is home, so nobody turns visiting', async () => {
		vatusa.home.mockRejectedValue(new Error('VATUSA down'));
		const client = stubBookingsClient();

		await syncBookingSystem(client, db, RESTRICTION);

		expect(client.replaceMembers).not.toHaveBeenCalled();
		// T2 doesn't depend on VATUSA
		expect(client.grantEndorsement).toHaveBeenCalledWith(RESTRICTION, 1000001);
	});

	it('does not throw when the booking system refuses the roster', async () => {
		const client = stubBookingsClient();
		client.replaceMembers.mockRejectedValue(new Error('The booking system answered 503'));

		await expect(syncBookingSystem(client, db, RESTRICTION)).resolves.toBeUndefined();
	});

	it('does nothing without the booking system', async () => {
		await expect(syncBookingSystem(undefined, db, RESTRICTION)).resolves.toBeUndefined();
		expect(vatusa.home).not.toHaveBeenCalled();
	});
});

describe('syncBookingSystem T2', () => {
	it('grants T2-CTR holders and revokes everyone else, after the roster', async () => {
		const client = stubBookingsClient({
			endorsements: [{ id: 'e9', cid: 1000002 }]
		});

		await syncBookingSystem(client, db, RESTRICTION);

		expect(client.listEndorsements).toHaveBeenCalledWith(RESTRICTION);
		expect(client.grantEndorsement).toHaveBeenCalledWith(RESTRICTION, 1000001);
		expect(client.revokeEndorsement).toHaveBeenCalledWith(RESTRICTION, 'e9');
		expect(client.replaceMembers.mock.invocationCallOrder[0]).toBeLessThan(
			client.grantEndorsement.mock.invocationCallOrder[0]
		);
	});

	it('is off without the restriction ID setting', async () => {
		const client = stubBookingsClient();

		await syncBookingSystem(client, db, undefined);

		expect(client.listEndorsements).not.toHaveBeenCalled();
		expect(client.grantEndorsement).not.toHaveBeenCalled();
		expect(client.replaceMembers).toHaveBeenCalled();
	});

	it('changes nothing when the endorsements cannot be read, as for a wrong restriction ID', async () => {
		const client = stubBookingsClient();
		client.listEndorsements.mockRejectedValue(new Error('no restriction restriction-1'));

		await syncBookingSystem(client, db, RESTRICTION);

		expect(client.grantEndorsement).not.toHaveBeenCalled();
		expect(client.revokeEndorsement).not.toHaveBeenCalled();
	});

	it('carries on past a failed grant', async () => {
		await seedMember(db, {
			cid: '1000003',
			firstName: 'Casey',
			lastName: 'Third',
			endorsements: ['T2-CTR']
		});
		const client = stubBookingsClient();
		client.grantEndorsement.mockRejectedValueOnce(new Error('refused'));

		await syncBookingSystem(client, db, RESTRICTION);

		expect(client.grantEndorsement).toHaveBeenCalledTimes(2);
	});
});
