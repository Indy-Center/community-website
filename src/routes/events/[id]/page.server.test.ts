import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import {
	eventBookingProblemsTable,
	eventBriefingsTable,
	eventPositionsTable
} from '$lib/db/schema/events';
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

function visit(roles: string[] = []) {
	return callLoad(load, {
		locals: { db, roles, positions: async () => [] },
		params: { id: EVENT_ID },
		url: new URL(`https://flyindycenter.com/events/${EVENT_ID}`)
	}) as Promise<Exclude<Awaited<ReturnType<typeof load>>, void>>;
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

	it('gives only event managers the briefing to send', async () => {
		expect((await visit()).briefing).toBeNull();

		const { briefing } = await visit(['events:manage']);
		expect(briefing).toMatchObject({ sent: false, text: '', briefUrl: '' });
		// The ping, title, start and roster are counted before anything is typed
		expect(briefing?.fixedLength).toBeGreaterThan(100);
	});

	it('starts an update from the briefing that was sent', async () => {
		await db.insert(eventBriefingsTable).values({
			eventId: EVENT_ID,
			text: 'Expect heavy arrivals.',
			briefUrl: 'https://example.test/brief.pdf',
			roleId: '900000000000000001',
			messageIds: ['message-1'],
			sentAt: new Date(),
			updatedAt: new Date()
		});

		expect((await visit(['events:manage'])).briefing).toMatchObject({
			sent: true,
			text: 'Expect heavy arrivals.',
			briefUrl: 'https://example.test/brief.pdf'
		});
	});

	it('shows booking problems to event managers only', async () => {
		await db.insert(eventBookingProblemsTable).values({
			id: 'problem-1',
			eventId: EVENT_ID,
			positionId: 'IND_APP',
			callsign: 'IND_APP',
			cid: '1000001',
			action: 'book',
			message: 'The controller already has a booking at this time',
			createdAt: new Date()
		});

		expect((await visit()).bookingProblems).toEqual([]);
		expect((await visit(['events:manage'])).bookingProblems).toMatchObject([
			{ callsign: 'IND_APP', message: 'The controller already has a booking at this time' }
		]);
	});
});
