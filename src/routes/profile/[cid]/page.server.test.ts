import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '$lib/server/db';
import {
	AVAILABLE_CREDENTIALS,
	expectNothingPrivate,
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
		lastName: 'Hiddenlast',
		namePrivacy: true,
		certification: 'T-RC',
		endorsements: ['T2-CTR', 'S-LC'],
		user: { id: 'user-jane', email: 'jane@private.example.test' }
	});
	// On the controller roster without a site account
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Sam',
		lastName: 'Shown',
		certification: 'S-GC'
	});
	await seedMember(db, { cid: '1000003', firstName: 'Robin', lastName: 'Example' });
});

function visit(cid: string) {
	return callLoad(load, { locals: { db, roles: [] }, params: { cid } });
}

describe('/profile/<cid>', () => {
	it("shows a controller's certification and endorsements from the roster copy, with names to show", async () => {
		const data = await visit('1000001');

		expect(data.profile.certifications).toEqual(['T-RC']);
		expect(data.profile.endorsements).toEqual(['T2-CTR', 'S-LC']);
		expect(data.profile.credentials).toEqual(
			AVAILABLE_CREDENTIALS.map(({ code, name }) => ({ code, name }))
		);
	});

	it('shows no credentials, and no error, for a controller who holds none', async () => {
		const data = await visit('1000003');

		expect(data.profile.certifications).toEqual([]);
		expect(data.profile.endorsements).toEqual([]);
	});

	it('shows the credentials of a controller who has no site account', async () => {
		const data = await visit('1000002');

		expect(data.profile.name).toBe('Sam Shown');
		expect(data.profile.certifications).toEqual(['S-GC']);
		expect(data.profile.endorsements).toEqual([]);
	});

	it('does not serve the last name of a controller with VATUSA name privacy set', async () => {
		const data = await visit('1000001');

		expect(data.profile.name).toBe('Jane');
		expectNothingPrivate(data, ['Hiddenlast']);
	});
});
