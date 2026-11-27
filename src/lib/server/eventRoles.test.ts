import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { eventBriefingsTable, eventsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { seedEvent, testDb } from '$lib/testing/db';
import { fakeLarry } from '$lib/testing/larry';
import type { LarryBinding } from '$lib/server/larry';
import { removeEndedEventRoles } from './eventRoles';

// Every event and Discord ID here is made up
const NOW = new Date('2026-12-01T12:00:00Z');
const HOUR = 3600000;

let db: Database;

// An event that ends this many hours from NOW (negative: already over), with a briefing out
async function eventWithBriefing(id: string, endsInHours: number, roleId: string | null) {
	await seedEvent(db, { id, positions: [] });
	await db
		.update(eventsTable)
		.set({
			startTime: new Date(NOW.getTime() + (endsInHours - 3) * HOUR),
			endTime: new Date(NOW.getTime() + endsInHours * HOUR)
		})
		.where(eq(eventsTable.id, id));
	await db.insert(eventBriefingsTable).values({
		eventId: id,
		text: 'Brief.',
		briefUrl: null,
		roleId,
		messageIds: ['message-1'],
		sentAt: NOW,
		updatedAt: NOW
	});
}

const roleOf = async (id: string) =>
	(await db.query.eventBriefingsTable.findFirst({ where: eq(eventBriefingsTable.eventId, id) }))
		?.roleId;

beforeEach(async () => {
	db = await testDb();
});

describe('removeEndedEventRoles', () => {
	it('deletes the roles of events that have ended, and only theirs', async () => {
		await eventWithBriefing('ended', -1, '900000000000000001');
		await eventWithBriefing('upcoming', 5, '900000000000000002');
		const larry = fakeLarry();

		await removeEndedEventRoles(larry as unknown as LarryBinding, db, NOW);

		expect(larry.deletedRoles).toEqual([['900000000000000001']]);
		expect(await roleOf('ended')).toBeNull();
		expect(await roleOf('upcoming')).toBe('900000000000000002');
	});

	it('keeps the briefing, and deletes a role only once', async () => {
		await eventWithBriefing('ended', -1, '900000000000000001');
		const larry = fakeLarry();

		await removeEndedEventRoles(larry as unknown as LarryBinding, db, NOW);
		await removeEndedEventRoles(larry as unknown as LarryBinding, db, NOW);

		expect(larry.deletedRoles).toHaveLength(1);
		expect(
			await db.query.eventBriefingsTable.findFirst({
				where: eq(eventBriefingsTable.eventId, 'ended')
			})
		).toMatchObject({ messageIds: ['message-1'] });
	});

	it("keeps a role Discord won't delete, to try again next run", async () => {
		await eventWithBriefing('ended', -1, '900000000000000001');
		const larry = fakeLarry({ deleteRoles: 'Missing Permissions' });

		await expect(
			removeEndedEventRoles(larry as unknown as LarryBinding, db, NOW)
		).resolves.toBeUndefined();

		expect(await roleOf('ended')).toBe('900000000000000001');
	});

	it('does nothing without Larry', async () => {
		await eventWithBriefing('ended', -1, '900000000000000001');

		await removeEndedEventRoles(undefined, db, NOW);

		expect(await roleOf('ended')).toBe('900000000000000001');
	});
});
