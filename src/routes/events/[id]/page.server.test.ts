import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	eventPositionRequestsTable,
	eventPositionsTable,
	eventsTable
} from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
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
		fname: 'Jane',
		lname: 'Doe',
		user: { id: 'user-jane', email: 'jane@private.example.test', operatingInitials: 'JD' }
	});
	await seedMember(db, {
		cid: '1000002',
		fname: 'Alex',
		lname: 'Sample',
		user: {
			id: 'user-alex',
			email: 'alex@private.example.test',
			preferredName: 'Al Sample',
			operatingInitials: 'AS'
		}
	});
	await db.insert(eventsTable).values({
		id: EVENT_ID,
		name: 'Example Fly-In',
		type: 'home',
		rosterType: 'assigned',
		description: 'A made-up event.',
		startTime: new Date('2026-11-01T23:00:00Z'),
		endTime: new Date('2026-11-02T02:00:00Z'),
		isPublished: true,
		isRosterPublished: true
	});
	await db.insert(eventPositionsTable).values([
		{ eventId: EVENT_ID, position: 'IND_APP', userId: 'user-jane' },
		{ eventId: EVENT_ID, position: 'IND_TWR', userId: null }
	]);
	await db.insert(eventPositionRequestsTable).values({
		id: 'request-1',
		eventId: EVENT_ID,
		userId: 'user-alex',
		comments: 'Happy to take any tower.'
	});
});

function visit() {
	return callLoad(load, { locals: { db, roles: [] }, params: { id: EVENT_ID } });
}

describe('/events/[id]', () => {
	it('names who holds each position and who asked for one, with their initials', async () => {
		const { event } = (await visit()) as Exclude<Awaited<ReturnType<typeof visit>>, void>;

		expect(
			event.positions.map(({ position, userId, user }) => ({ position, userId, user }))
		).toEqual([
			{
				position: 'IND_APP',
				userId: 'user-jane',
				user: { firstName: 'Jane', lastName: 'Doe', preferredName: null, operatingInitials: 'JD' }
			},
			{ position: 'IND_TWR', userId: null, user: null }
		]);
		expect(event.positionRequests).toEqual([
			{
				userId: 'user-alex',
				comments: 'Happy to take any tower.',
				createdAt: expect.any(Date),
				user: {
					firstName: 'Alex',
					lastName: 'Sample',
					preferredName: 'Al Sample',
					operatingInitials: 'AS'
				}
			}
		]);
	});

	it("sends no assignee's or requester's email or Connect record to a visitor", async () => {
		expectNothingPrivate(await visit());
	});
});
