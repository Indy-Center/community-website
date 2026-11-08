import { beforeEach, describe, expect, it } from 'vitest';
import { Role } from '$lib/utils/permissions';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { load } from './+page.server';

let db: Database;

beforeEach(async () => {
	db = await testDb();
	// Saved the settings form unchanged, so the preferred name is the pre-filled full name
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Pat',
		lastName: 'Prefilled',
		namePrivacy: true,
		roles: ['ATM'],
		user: { id: 'user-pat', email: 'pat@private.example.test', preferredName: 'Pat Prefilled' }
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
	it('shows a privacy-flagged member by first name and CID when their preferred name is the pre-filled full name', async () => {
		const data = await callLoad(load, { locals: { db, roles: [Role.ADMIN] } });

		expect(data.staff.find((p) => p.key === 'ATM')?.members.map((m) => m.name)).toEqual([
			'Pat 1000001'
		]);
		expect(data.controllers.map((c) => c.name)).toEqual(['Pat 1000001', 'Rob E']);
		expectNothingPrivate(data, ['Prefilled', 'Example']);
	});

	it('still shows a real custom preferred name', async () => {
		const data = await callLoad(load, { locals: { db, roles: [] } });

		expect(data.staff.find((p) => p.key === 'DATM')?.members.map((m) => m.name)).toEqual(['Rob E']);
	});
});
