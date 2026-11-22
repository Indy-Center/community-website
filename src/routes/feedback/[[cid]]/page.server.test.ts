import { beforeEach, describe, expect, it } from 'vitest';
import type { ChannelSend } from '@indy-center/indy-larry-worker';
import type { Database } from '$lib/server/db';
import { expectNothingPrivate, seedMember, testDb } from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { LarryChannel } from '$lib/server/larry';
import { actions, load } from './+page.server';

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
	await seedMember(db, {
		cid: '1000003',
		firstName: 'Casey',
		lastName: 'Pilot',
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

describe('submitting feedback', () => {
	async function submit(fields: Record<string, string>) {
		const queued: ChannelSend[] = [];
		const user = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, 'user-casey')
		});
		await actions.default({
			request: new Request('https://flyindycenter.com/feedback', {
				method: 'POST',
				body: new URLSearchParams(fields)
			}),
			locals: { db, user, roles: [] },
			url: new URL('https://flyindycenter.com/feedback'),
			platform: { env: { LARRY: { enqueue: async (m: ChannelSend) => void queued.push(m) } } }
		} as never);
		return queued;
	}

	it('always saves new feedback for review, whatever status the form sends', async () => {
		const queued = await submit({
			controllerId: 'user-jane',
			rating: 'very_good',
			position: 'IND_GND',
			status: 'approved'
		});

		const [saved] = await db.query.feedbackTable.findMany();
		expect(saved).toMatchObject({
			controllerId: 'user-jane',
			rating: 'very_good',
			status: 'pending'
		});
		expect(queued.map((m) => m.channel)).toEqual([LarryChannel.SENIOR_STAFF_ALERTS]);
		expect(queued[0].buttons?.[0].url).toBe(`https://flyindycenter.com/admin/feedback/${saved.id}`);
	});
});
