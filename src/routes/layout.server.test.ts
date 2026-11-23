import { describe, expect, it } from 'vitest';
import { seedMember, testDb } from '$lib/testing/db';
import { load } from './+layout.server';

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
				session: {
					id: 'session-1',
					userId: 'user-1',
					expiresAt: new Date('2026-11-14T12:00:00Z'),
					data: { identityToken: 'secret-access-token' }
				}
			} as never
		});

		expect(data).toEqual({ user, userName: 'Jordan Sample', roles: [] });
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

		const data = await load({ locals: { db, user, roles: [] } as never });

		expect(data.userName).toBe('Jordan 1000001');
	});

	it('names nobody for a guest', async () => {
		const data = await load({ locals: { db: await testDb(), roles: [] } as never });

		expect(data.userName).toBeNull();
	});
});
