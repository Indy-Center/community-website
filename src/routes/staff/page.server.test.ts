import { beforeEach, describe, expect, it } from 'vitest';
import { Role } from '$lib/utils/permissions';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { load } from './+page.server';

let db: Database;

beforeEach(async () => {
	db = await testDb();
	// Flagged private and hasn't chosen a name
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Pat',
		lastName: 'Hiddenlast',
		namePrivacy: true,
		roles: ['ATM'],
		user: { id: 'user-pat', email: 'pat@private.example.test' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Robin',
		lastName: 'Example',
		namePrivacy: true,
		roles: ['DATM'],
		user: { id: 'user-robin', email: 'robin@private.example.test', preferredName: 'Rob E' }
	});
});

describe('/staff', () => {
	it('shows a privacy-flagged member with no preferred name by first name and CID', async () => {
		const data = await callLoad(load, { locals: { db, roles: [Role.ADMIN] } });

		expect(data.staff.find((p) => p.key === 'ATM')?.members.map((m) => m.name)).toEqual([
			'Pat 1000001'
		]);
		expect(data.controllers.map((c) => c.name)).toEqual(['Pat 1000001', 'Rob E']);
		expectNothingPrivate(data, ['Hiddenlast', 'Example']);
	});

	it('still shows a real custom preferred name', async () => {
		const data = await callLoad(load, { locals: { db, roles: [] } });

		expect(data.staff.find((p) => p.key === 'DATM')?.members.map((m) => m.name)).toEqual(['Rob E']);
	});
});
