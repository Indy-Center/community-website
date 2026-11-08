import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '$lib/server/db';
import {
	AVAILABLE_CREDENTIALS,
	seedAvailableCredentials,
	seedMember,
	testDb
} from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { load } from './+page.server';

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedAvailableCredentials(db);
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jane',
		lastName: 'Example',
		certification: 'T-RC',
		endorsements: ['T2-CTR'],
		user: { id: 'user-jane', email: 'jane@private.example.test' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Robin',
		lastName: 'Example',
		user: { id: 'user-robin', email: 'robin@private.example.test' }
	});
	// A community member: a site account, not on the controller roster
	await seedMember(db, {
		cid: '1000003',
		firstName: 'Pat',
		lastName: 'Example',
		onRoster: false,
		user: { id: 'user-pat', email: 'pat@private.example.test', membership: 'community' }
	});
});

async function visit(userId: string) {
	const user = await db.query.usersTable.findFirst({
		where: (users, { eq }) => eq(users.id, userId)
	});
	return callLoad(load, {
		locals: { db, user },
		url: new URL('https://flyindycenter.com/profile')
	});
}

describe('/profile', () => {
	it("shows the signed-in controller's certification and endorsements from the roster copy", async () => {
		const data = await visit('user-jane');

		expect(data.certifications).toEqual(['T-RC']);
		expect(data.endorsements).toEqual(['T2-CTR']);
		expect(data.credentials).toEqual(
			AVAILABLE_CREDENTIALS.map(({ code, name }) => ({ code, name }))
		);
	});

	it('shows no credentials, and no error, for a controller who holds none', async () => {
		const data = await visit('user-robin');

		expect(data.certifications).toEqual([]);
		expect(data.endorsements).toEqual([]);
	});

	it('shows none for a community member, who is not on the controller roster', async () => {
		const data = await visit('user-pat');

		expect(data.certifications).toEqual([]);
		expect(data.endorsements).toEqual([]);
		expect(data.hasPublicProfile).toBe(false);
	});
});
