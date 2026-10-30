import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedEvent, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { Role } from '$lib/utils/permissions';
import { load } from './+page.server';

vi.mock('$lib/server/vatsim/vnasDataClient.js', () => ({
	fetchArtccInformation: async () => null
}));

const EVENT_ID = 'event-1';

let db: Database;

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jane',
		lastName: 'Doe',
		user: { id: 'user-jane', email: 'jane@private.example.test', operatingInitials: 'JD' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Alex',
		lastName: 'Sample',
		user: { id: 'user-alex', email: 'alex@private.example.test', preferredName: 'Al Sample' }
	});
	await seedEvent(db, {
		id: EVENT_ID,
		positions: [{ position: 'IND_APP', userId: 'user-jane' }],
		requests: [{ id: 'request-1', userId: 'user-alex', comments: 'Any tower.' }]
	});
});

function visitAsEventManager() {
	return callLoad(load, {
		locals: { db, roles: [Role.CAN_MANAGE_EVENTS] },
		params: { id: EVENT_ID },
		depends: () => {}
	}) as Promise<Exclude<Awaited<ReturnType<typeof load>>, void>>;
}

describe('/events/[id]/positions', () => {
	it('offers every member to assign, by name, with what the picker searches on', async () => {
		const { users } = await visitAsEventManager();

		expect(users).toEqual([
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

	it("sends an event manager no member's email or Connect record", async () => {
		expectNothingPrivate(await visitAsEventManager());
	});
});
