import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { credentialName } from '$lib/credentials';
import { eventPositionsTable } from '$lib/db/schema/events';
import {
	AVAILABLE_CREDENTIALS,
	expectNothingPrivate,
	seedAvailableCredentials,
	seedEvent,
	seedMember,
	testDb
} from '$lib/testing/db';
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

	it('serves the available credentials, so required credentials show by name', async () => {
		await seedAvailableCredentials(db);
		await db
			.update(eventPositionsTable)
			.set({ requiredCertifications: ['T-RC'], requiredEndorsements: ['T2-CTR', 'GONE-1'] })
			.where(eq(eventPositionsTable.position, 'IND_APP'));

		const { event, credentials } = await visitAsEventManager();

		expect(credentials).toEqual(AVAILABLE_CREDENTIALS);
		const [position] = event.positions;
		expect(
			position.requiredCertifications.map((code) => credentialName(credentials, code))
		).toEqual(['Terminal Radar Control']);
		// A code that isn't among the available credentials shows as itself
		expect(position.requiredEndorsements.map((code) => credentialName(credentials, code))).toEqual([
			'Tier 2 Center',
			'GONE-1'
		]);
	});

	it("sends an event manager no member's email or Connect record", async () => {
		expectNothingPrivate(await visitAsEventManager());
	});
});
