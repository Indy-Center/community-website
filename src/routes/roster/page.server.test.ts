import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '$lib/utils/permissions';
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

vi.mock('$lib/server/vatsim/vnasDataClient.js', () => ({ fetchControllers: async () => [] }));

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedAvailableCredentials(db);
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jane',
		lastName: 'Hiddenlast',
		namePrivacy: true,
		rating: 'S2',
		joined: '2024-03-01T00:00:00+00:00',
		certification: 'T-RC',
		endorsements: ['T2-CTR'],
		user: {
			id: 'user-jane',
			email: 'jane@private.example.test',
			operatingInitials: 'JH'
		}
	});
	// On the controller roster without a site account
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Sam',
		lastName: 'Shown',
		rating: 'C1',
		joined: '2023-06-01T00:00:00+00:00',
		certification: 'S-GC'
	});
	await seedMember(db, {
		cid: '1000003',
		firstName: 'Robin',
		lastName: 'Example',
		joined: null,
		user: { id: 'user-robin', email: 'robin@private.example.test', preferredName: 'Rob E' }
	});
});

function visit(roles: string[] = []) {
	return callLoad(load, { locals: { db, roles } });
}

describe('/roster', () => {
	it('lists each member with their name, honouring VATUSA name privacy, and their credentials', async () => {
		const data = await visit();

		expect(data.roster).toEqual([
			{
				cid: '1000001',
				name: 'Jane 1000001',
				rating: 'S2',
				joined: '2024-03-01T00:00:00+00:00',
				operatingInitials: 'JH',
				certification: 'T-RC',
				endorsements: ['T2-CTR']
			},
			{
				cid: '1000002',
				name: 'Sam Shown',
				rating: 'C1',
				joined: '2023-06-01T00:00:00+00:00',
				operatingInitials: null,
				certification: 'S-GC',
				endorsements: []
			},
			{
				cid: '1000003',
				name: 'Rob E',
				rating: 'S2',
				joined: null,
				operatingInitials: null,
				certification: null,
				endorsements: []
			}
		]);
	});

	it('sends the available credentials once, in order, to name and sort the chips', async () => {
		const data = await visit();

		expect(data.credentials).toEqual(AVAILABLE_CREDENTIALS);
	});

	it('sends no email, Connect record, roster copy row or hidden last name to a visitor', async () => {
		const data = await visit();

		expect(data.roster[0]).not.toHaveProperty('lastName');
		expectNothingPrivate(data, ['Hiddenlast']);
	});

	it("gives an admin each member's account id for the manage link, and nothing more private", async () => {
		const data = await visit([Role.ADMIN]);

		expect(data.roster.map((member) => member.userId)).toEqual([
			'user-jane',
			undefined,
			'user-robin'
		]);
		expectNothingPrivate(data, ['Hiddenlast']);
	});
});
