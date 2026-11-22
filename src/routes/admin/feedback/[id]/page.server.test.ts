import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type { ChannelSend } from '@indy-center/indy-larry-worker';
import type { Database } from '$lib/server/db';
import { feedbackTable } from '$lib/db/schema/feedback';
import { userRolesTable } from '$lib/db/schema/roles';
import { LarryChannel } from '$lib/server/larry';
import { seedMember, testDb } from '$lib/testing/db';
import { actions } from './+page.server';

let db: Database;

const FEEDBACK_ID = 'feedback-1';

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Casey',
		lastName: 'Controller',
		user: { id: 'user-casey', email: 'casey@private.example.test', operatingInitials: 'CC' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Riley',
		lastName: 'Reviewer',
		user: { id: 'user-riley', email: 'riley@private.example.test' }
	});
	await seedMember(db, {
		cid: '1000003',
		firstName: 'Pat',
		lastName: 'Pilot',
		onRoster: false,
		user: { id: 'user-pat', email: 'pat@private.example.test', membership: 'basic' }
	});
	await db.insert(userRolesTable).values({ userId: 'user-riley', role: 'feedback:reviewer' });
	await db.insert(feedbackTable).values({
		id: FEEDBACK_ID,
		submitterId: 'user-pat',
		controllerId: 'user-casey',
		rating: 'excellent',
		status: 'pending',
		position: 'IND_APP',
		callsign: 'N123AB',
		feedback: 'Smooth vectors into the field.'
	});
});

/** A stand-in for Larry's binding that records what it was asked to queue. */
function fakeLarry({ refuse }: { refuse?: string } = {}) {
	const queued: ChannelSend[] = [];
	return {
		queued,
		async enqueue(request: ChannelSend) {
			// Larry checks the channel before queueing, as it does for one missing from SEND_CHANNELS
			if (request.channel === refuse) throw new Error(`Unknown channel "${refuse}"`);
			queued.push(request);
		}
	};
}

async function act(
	action: keyof typeof actions,
	fields: Record<string, string>,
	{ userId = 'user-riley', roles = ['feedback:reviewer'], larry = fakeLarry() } = {}
) {
	const user = await db.query.usersTable.findFirst({
		where: (users, { eq }) => eq(users.id, userId)
	});
	const event = {
		request: new Request(`https://flyindycenter.com/admin/feedback/${FEEDBACK_ID}`, {
			method: 'POST',
			body: new URLSearchParams(fields)
		}),
		locals: { db, user, roles },
		params: { id: FEEDBACK_ID },
		platform: { env: { LARRY: larry } }
	};
	return (await actions[action](event as never)) as {
		status?: number;
		success?: boolean;
		posted?: boolean | null;
	};
}

const feedback = () =>
	db.query.feedbackTable.findFirst({ where: (f, { eq }) => eq(f.id, FEEDBACK_ID) });
const log = () =>
	db.query.feedbackEventsTable.findMany({ where: (e, { eq }) => eq(e.feedbackId, FEEDBACK_ID) });

describe('accept and publish', () => {
	it('accepts and publishes identified feedback, then queues the alert and the public post', async () => {
		const larry = fakeLarry();
		const result = await act('acceptAndPublish', { mode: 'identified' }, { larry });

		expect(result).toEqual({ success: true, posted: true });
		expect(await feedback()).toMatchObject({
			status: 'approved',
			publishMode: 'identified',
			publishedRating: 'excellent',
			publishedPosition: 'IND_APP',
			publishedCallsign: 'N123AB',
			publishedPilotName: 'Pat P.',
			publishedFeedback: 'Smooth vectors into the field.'
		});
		expect((await log()).map((e) => [e.type, e.value]).sort()).toEqual([
			['published', 'identified'],
			['status', 'approved']
		]);
		expect(larry.queued.map((m) => m.channel)).toEqual([
			LarryChannel.SENIOR_STAFF_ALERTS,
			LarryChannel.FEEDBACK
		]);
		expect(larry.queued[1].embeds![0].fields).toContainEqual({
			name: 'Controller',
			value: 'Casey Controller (CC)',
			inline: true
		});
	});

	it('changes nothing when the save fails part way', async () => {
		// The log entries can't be written, so the batch fails after the feedback update
		await db.run(sql`drop table feedback_events`);
		const larry = fakeLarry();

		const result = await act('acceptAndPublish', { mode: 'identified' }, { larry });

		expect(result.status).toBe(500);
		expect(await feedback()).toMatchObject({ status: 'pending', publishMode: null });
		expect(larry.queued).toHaveLength(0);
	});

	it("keeps the feedback published and notes it when Larry won't queue the post", async () => {
		const larry = fakeLarry({ refuse: LarryChannel.FEEDBACK });
		const result = await act('acceptAndPublish', { mode: 'identified' }, { larry });

		expect(result).toEqual({ success: true, posted: false });
		expect(await feedback()).toMatchObject({ status: 'approved', publishMode: 'identified' });
		const published = (await log()).find((e) => e.type === 'published');
		expect(published?.body).toMatch(/couldn't be queued/);
	});

	it('stores no pilot details and posts nothing publicly for de-identified feedback', async () => {
		const larry = fakeLarry();
		const result = await act('acceptAndPublish', { mode: 'deidentified' }, { larry });

		expect(result).toEqual({ success: true, posted: null });
		expect(await feedback()).toMatchObject({
			status: 'approved',
			publishMode: 'deidentified',
			publishedCallsign: null,
			publishedPilotName: null
		});
		expect(larry.queued.map((m) => m.channel)).toEqual([LarryChannel.SENIOR_STAFF_ALERTS]);
	});

	it('refuses feedback that is already published', async () => {
		await act('acceptAndPublish', { mode: 'deidentified' });
		const result = await act('acceptAndPublish', { mode: 'identified' });

		expect(result.status).toBe(400);
		expect(await feedback()).toMatchObject({ publishMode: 'deidentified' });
	});

	it('refuses someone who is not a reviewer', async () => {
		const result = await act(
			'acceptAndPublish',
			{ mode: 'identified' },
			{ userId: 'user-pat', roles: [] }
		);

		expect(result.status).toBe(403);
		expect(await feedback()).toMatchObject({ status: 'pending', publishMode: null });
	});
});

describe('status changes', () => {
	it('saves a follow up with its assignee and logs both', async () => {
		const larry = fakeLarry();
		const result = await act(
			'followUp',
			{ assigneeId: 'user-riley', note: 'Asking the pilot for more' },
			{ larry }
		);

		expect(result).toEqual({ success: true });
		expect(await feedback()).toMatchObject({ status: 'follow_up', assigneeId: 'user-riley' });
		expect((await log()).map((e) => [e.type, e.value, e.body]).sort()).toEqual([
			['assigned', 'user-riley', null],
			['status', 'follow_up', 'Asking the pilot for more']
		]);
		expect(larry.queued[0].embeds![0].fields).toContainEqual({
			name: '📌 Assigned to',
			value: 'Riley Reviewer (1000002)',
			inline: true
		});
	});

	it('still saves the change when Larry is unavailable', async () => {
		const result = await act('reject', {}, { larry: fakeLarry({ refuse: 'senior-staff-alerts' }) });

		expect(result).toEqual({ success: true });
		expect(await feedback()).toMatchObject({ status: 'rejected' });
	});
});

describe('publish', () => {
	it('publishes accepted feedback with the values staff edited', async () => {
		await act('accept', {});
		const larry = fakeLarry();
		const result = await act(
			'publish',
			{
				mode: 'identified',
				rating: 'very_good',
				position: 'Indy Approach',
				callsign: 'N123AB',
				pilotName: 'Pat',
				feedback: 'Smooth vectors.'
			},
			{ larry }
		);

		expect(result).toEqual({ success: true, posted: true });
		expect(await feedback()).toMatchObject({
			publishedRating: 'very_good',
			publishedPosition: 'Indy Approach',
			publishedPilotName: 'Pat',
			// The original submission is never changed
			rating: 'excellent',
			feedback: 'Smooth vectors into the field.'
		});
		expect(larry.queued.map((m) => m.channel)).toEqual([LarryChannel.FEEDBACK]);
	});
});
