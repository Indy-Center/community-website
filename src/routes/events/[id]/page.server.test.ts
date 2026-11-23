import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { eventPositionsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedEvent, seedMember, testDb } from '$lib/testing/db';
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
		firstName: 'Jane',
		lastName: 'Doe',
		user: { id: 'user-jane', email: 'jane@private.example.test', operatingInitials: 'JD' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Alex',
		lastName: 'Sample',
		user: {
			id: 'user-alex',
			email: 'alex@private.example.test',
			preferredName: 'Al Sample',
			operatingInitials: 'AS'
		}
	});
	await seedEvent(db, {
		id: EVENT_ID,
		positions: [
			{ position: 'IND_APP', userId: 'user-jane' },
			{ position: 'IND_TWR', userId: null }
		],
		requests: [{ id: 'request-1', userId: 'user-alex', comments: 'Happy to take any tower.' }]
	});
});

function visit() {
	return callLoad(load, { locals: { db, roles: [] }, params: { id: EVENT_ID } }) as Promise<
		Exclude<Awaited<ReturnType<typeof load>>, void>
	>;
}

describe('/events/[id]', () => {
	it('names who holds each position and who asked for one, with their initials', async () => {
		const { event } = await visit();

		expect(
			event.positions.map(({ position, userId, user }) => ({ position, userId, user }))
		).toEqual([
			{
				position: 'IND_APP',
				userId: 'user-jane',
				user: { cid: '1000001', name: 'Jane Doe', operatingInitials: 'JD' }
			},
			{ position: 'IND_TWR', userId: null, user: null }
		]);
		expect(event.positionRequests).toEqual([
			{
				userId: 'user-alex',
				comments: 'Happy to take any tower.',
				createdAt: expect.any(Date),
				user: { cid: '1000002', name: 'Al Sample', operatingInitials: 'AS' }
			}
		]);
	});

	it('names a member with VATUSA name privacy by first name and CID, never the last name', async () => {
		await seedMember(db, {
			cid: '1000003',
			firstName: 'Robin',
			lastName: 'Hiddenlast',
			namePrivacy: true,
			user: { id: 'user-robin', email: 'robin@private.example.test', operatingInitials: 'RH' }
		});
		await db
			.update(eventPositionsTable)
			.set({ userId: 'user-robin' })
			.where(eq(eventPositionsTable.position, 'IND_TWR'));

		const data = await visit();

		expect(data.event.positions.find((p) => p.position === 'IND_TWR')?.user?.name).toBe(
			'Robin 1000003'
		);
		expectNothingPrivate(data, ['Hiddenlast']);
	});

	it("sends no assignee's or requester's email or Connect record to a visitor", async () => {
		expectNothingPrivate(await visit());
	});
});
