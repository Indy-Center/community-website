import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { load } from './+page.server';

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		fname: 'Jane',
		lname: 'Doe',
		user: { id: 'user-jane', email: 'jane@private.example.test', operatingInitials: 'JD' }
	});
	await seedMember(db, {
		cid: '1000002',
		fname: 'Alex',
		lname: 'Sample',
		user: { id: 'user-alex', email: 'alex@private.example.test', preferredName: 'Al Sample' }
	});
	await seedMember(db, {
		cid: '1000003',
		fname: 'Casey',
		lname: 'Pilot',
		onRoster: false,
		user: { id: 'user-casey', email: 'casey@private.example.test', membership: 'community' }
	});
});

function visit(cid?: string) {
	const path = cid ? `/feedback/${cid}` : '/feedback';
	return callLoad(load, {
		locals: { db, roles: [] },
		params: cid ? { cid } : {},
		url: new URL(path, 'https://flyindycenter.com')
	});
}

describe('/feedback', () => {
	it('lists the controllers to choose from, by display name, with what the search matches on', async () => {
		const { controllers } = await visit();

		expect(controllers).toEqual([
			{
				id: 'user-alex',
				cid: '1000002',
				firstName: 'Alex',
				lastName: 'Sample',
				preferredName: 'Al Sample',
				operatingInitials: null
			},
			{
				id: 'user-jane',
				cid: '1000001',
				firstName: 'Jane',
				lastName: 'Doe',
				preferredName: null,
				operatingInitials: 'JD'
			}
		]);
	});

	it('pre-selects the controller a /feedback/<cid> link names', async () => {
		const { form } = await visit('1000001');

		expect(form.data.controllerId).toBe('user-jane');
	});

	it("sends no controller's email or Connect record to a visitor", async () => {
		expectNothingPrivate(await visit());
	});
});
