import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '$lib/utils/permissions';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { load } from './+page.server';

vi.mock('$lib/server/vatsim/vnasDataClient.js', () => ({ fetchControllers: async () => [] }));

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		fname: 'Jane',
		lname: 'Hiddenlast',
		namePrivacy: true,
		rating: 'S2',
		joined: '2024-03-01T00:00:00+00:00',
		user: {
			id: 'user-jane',
			email: 'jane@private.example.test',
			operatingInitials: 'JH',
			certifications: ['GND'],
			endorsements: ['T2CTR']
		}
	});
	await seedMember(db, {
		cid: '1000002',
		fname: 'Sam',
		lname: 'Shown',
		rating: 'C1',
		joined: '2023-06-01T00:00:00+00:00'
	});
	await seedMember(db, {
		cid: '1000003',
		fname: 'Robin',
		lname: 'Example',
		user: { id: 'user-robin', email: 'robin@private.example.test', preferredName: 'Rob E' }
	});
});

function visit(roles: string[] = []) {
	return callLoad(load, { locals: { db, roles } });
}

describe('/roster', () => {
	it('lists each member with the name the roster shows, honouring VATUSA name privacy', async () => {
		const data = await visit();

		expect(data.roster).toEqual([
			{
				cid: '1000001',
				name: 'Jane 1000001',
				rating: 'S2',
				joined: '2024-03-01T00:00:00+00:00',
				operatingInitials: 'JH',
				certifications: ['GND'],
				endorsements: ['T2CTR']
			},
			{
				cid: '1000002',
				name: 'Sam Shown',
				rating: 'C1',
				joined: '2023-06-01T00:00:00+00:00',
				operatingInitials: null,
				certifications: [],
				endorsements: []
			},
			{
				cid: '1000003',
				name: 'Rob E',
				rating: 'S2',
				joined: '2024-01-15T00:00:00+00:00',
				operatingInitials: null,
				certifications: [],
				endorsements: []
			}
		]);
	});

	it('sends no email, Connect or VATUSA record, or hidden last name to a visitor', async () => {
		expectNothingPrivate(await visit(), ['Hiddenlast']);
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
