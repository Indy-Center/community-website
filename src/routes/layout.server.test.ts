import { describe, expect, it } from 'vitest';
import { cmsPosition } from '$lib/testing/bookings';
import { seedMember, testDb } from '$lib/testing/db';
import { load } from './+layout.server';

// The CMS catalogue's positions, as the root layout's reader gives them
const POSITIONS = [cmsPosition('IND_83_CTR', { name: 'Falmouth 83', radioName: 'Indy Center' })];
const positions = async () => POSITIONS;

describe('every page', () => {
	it("sends a signed-in visitor's page no session, so never their identity access token", async () => {
		const db = await testDb();
		await seedMember(db, {
			cid: '1234567',
			firstName: 'Jordan',
			lastName: 'Sample',
			user: { id: 'user-1', email: 'jordan@private.example.test' }
		});
		const user = await db.query.usersTable.findFirst();

		const data = await load({
			locals: {
				db,
				user,
				roles: [],
				positions,
				session: {
					id: 'session-1',
					userId: 'user-1',
					expiresAt: new Date('2026-11-14T12:00:00Z'),
					data: { identityToken: 'secret-access-token' }
				}
			} as never
		});

		expect(data).toEqual({ user, userName: 'Jordan Sample', roles: [], positions: POSITIONS });
		expect(JSON.stringify(data)).not.toContain('secret-access-token');
	});
});

describe('the header name', () => {
	it('names a signed-in member with VATUSA name privacy in the header by first name and CID', async () => {
		const db = await testDb();
		await seedMember(db, {
			cid: '1000001',
			firstName: 'Jordan',
			lastName: 'Hiddenlast',
			namePrivacy: true,
			user: { id: 'user-jordan', email: 'jordan@private.example.test' }
		});
		const user = await db.query.usersTable.findFirst();

		const data = await load({ locals: { db, user, roles: [], positions } as never });

		expect(data.userName).toBe('Jordan 1000001');
	});

	it('names nobody for a guest', async () => {
		const data = await load({ locals: { db: await testDb(), roles: [], positions } as never });

		expect(data.userName).toBeNull();
	});
});

describe('the positions catalogue', () => {
	it("gives every page the CMS catalogue's positions, for Centerline's Position", async () => {
		const data = await load({ locals: { db: await testDb(), roles: [], positions } as never });

		expect(data.positions).toEqual(POSITIONS);
	});
});
