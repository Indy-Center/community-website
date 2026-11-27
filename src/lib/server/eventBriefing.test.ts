import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { eventBriefingsTable, eventPositionsTable, eventsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { cmsPosition } from '$lib/testing/bookings';
import { seedEvent, seedMember, testDb } from '$lib/testing/db';
import { fakeLarry, type FakeLarry } from '$lib/testing/larry';
import type { LarryBinding } from '$lib/server/larry';
import { DISCORD_LIMIT } from '$lib/utils/briefing';
import { refreshBriefing, removeEventRole, sendBriefing } from './eventBriefing';

// Every member, position and Discord ID here is made up; the repository is public.
const EVENT_ID = 'event-1';
const ORIGIN = 'https://flyindycenter.com';
const crw = { id: 'CRW', name: 'Charleston ATCT', parent: null };
const catalogue = [
	cmsPosition('CRW_TWR', { id: 'crw-twr', shortName: 'LC', facility: crw }),
	cmsPosition('CRW_GND', { id: 'crw-gnd', shortName: 'GC', facility: crw })
];

let db: Database;
let larry: FakeLarry;

const binding = () => larry as unknown as LarryBinding;
const send = (text = 'Expect heavy arrivals.', briefUrl: string | null = null) =>
	sendBriefing(binding(), db, catalogue, EVENT_ID, { text, briefUrl }, ORIGIN);
const refresh = () => refreshBriefing(binding(), db, async () => catalogue, EVENT_ID, ORIGIN);
const saved = () =>
	db.query.eventBriefingsTable.findFirst({ where: eq(eventBriefingsTable.eventId, EVENT_ID) });

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jane',
		lastName: 'Doe',
		user: { id: 'user-jane', email: 'jane@private.example.test' }
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Alex',
		lastName: 'Sample',
		user: { id: 'user-alex', email: 'alex@private.example.test', preferredName: 'Al Sample' }
	});
	await seedEvent(db, {
		id: EVENT_ID,
		positions: [
			{ position: 'crw-twr', userId: 'user-jane' },
			{ position: 'crw-gnd', userId: null }
		]
	});
	larry = fakeLarry({
		discordByCid: {
			1000001: { id: '100000000000000001', source: 'linked', inServer: true },
			1000002: { id: '100000000000000002', source: 'vatusa', inServer: false }
		}
	});
});

describe('sendBriefing', () => {
	it("gives the roster the event's role, then posts pinging only that role", async () => {
		const result = await send('Expect heavy arrivals.', 'https://example.test/brief.pdf');

		expect(result).toEqual({ ok: true, missed: [] });
		expect(larry.roleSyncs).toEqual([
			{
				roles: [
					{
						key: 'event-event-1',
						id: null,
						name: 'Event: Example Fly-In',
						rename: true,
						members: ['100000000000000001'],
						exclusive: true
					}
				]
			}
		]);
		expect(larry.sent).toHaveLength(1);
		const [post] = larry.sent;
		expect(post.channel).toBe('controller-announcements');
		expect(post.allowedMentions).toEqual({ roles: ['900000000000000001'] });
		expect(post.buttons).toEqual([{ label: 'Open brief', url: 'https://example.test/brief.pdf' }]);
		expect(post.content).toContain('<@&900000000000000001>\n# [Example Fly-In]');
		expect(post.content).toContain('Expect heavy arrivals.');
		expect(post.content).toContain('## __CRW__\nLC - Jane Doe\nGC - Vacant');

		expect(await saved()).toMatchObject({
			text: 'Expect heavy arrivals.',
			briefUrl: 'https://example.test/brief.pdf',
			roleId: '900000000000000001',
			messageIds: ['message-1']
		});
	});

	it('names rostered controllers the ping misses: not in the server, or nothing linked', async () => {
		await db
			.update(eventPositionsTable)
			.set({ userId: 'user-alex' })
			.where(eq(eventPositionsTable.position, 'crw-gnd'));

		expect(await send()).toEqual({ ok: true, missed: ['Al Sample'] });
		expect(larry.roleSyncs[0].roles[0].members).toEqual(['100000000000000001']);
	});

	it('edits the post when sent again, without pinging or posting anew', async () => {
		await send();
		await send('New plan.', null);

		expect(larry.sent).toHaveLength(1);
		expect(larry.edited).toMatchObject([
			{ messageId: 'message-1', queued: false, buttons: [], allowedMentions: { parse: [] } }
		]);
		expect(larry.edited[0].content).toContain('New plan.');
		// The role is found by the ID it was given
		expect(larry.roleSyncs[1].roles[0].id).toBe('900000000000000001');
		expect(await saved()).toMatchObject({ text: 'New plan.', briefUrl: null });
	});

	it('refuses a briefing too long for one message, and posts nothing', async () => {
		const result = await send('x'.repeat(DISCORD_LIMIT));

		expect(result).toMatchObject({ ok: false, status: 400 });
		expect(larry.roleSyncs).toEqual([]);
		expect(larry.sent).toEqual([]);
	});

	it("posts nothing when the role can't be set up", async () => {
		larry = fakeLarry({ roles: new Error('Missing Permissions') });

		const result = await send();

		expect(result).toMatchObject({ ok: false, status: 502 });
		expect(result.ok || result.message).toContain('Missing Permissions');
		expect(larry.sent).toEqual([]);
		expect(await saved()).toBeUndefined();
	});

	it("saves nothing when Discord won't take the post", async () => {
		larry = fakeLarry({ postError: new Error('Unknown Channel') });

		expect(await send()).toMatchObject({ ok: false, status: 502 });
		expect(await saved()).toBeUndefined();
	});

	it("says so when there's no Larry", async () => {
		const result = await sendBriefing(
			undefined,
			db,
			catalogue,
			EVENT_ID,
			{ text: 'Hi', briefUrl: null },
			ORIGIN
		);

		expect(result).toMatchObject({ ok: false, status: 503 });
	});
});

describe('refreshBriefing', () => {
	it('does nothing for an event with no briefing out', async () => {
		await refresh();

		expect(larry.roleSyncs).toEqual([]);
		expect(larry.edited).toEqual([]);
	});

	it('queues an edit of the post and re-syncs the role after a roster change', async () => {
		await send();
		await db
			.update(eventPositionsTable)
			.set({ userId: null })
			.where(eq(eventPositionsTable.position, 'crw-twr'));

		await refresh();

		expect(larry.roleSyncs[1].roles[0]).toMatchObject({
			id: '900000000000000001',
			members: [],
			exclusive: true
		});
		expect(larry.edited).toHaveLength(1);
		expect(larry.edited[0]).toMatchObject({
			messageId: 'message-1',
			queued: true,
			allowedMentions: { parse: [] }
		});
		expect(larry.edited[0].content).toContain('LC - Vacant');
	});

	it('follows a new name and start time', async () => {
		await send();
		await db
			.update(eventsTable)
			.set({ name: 'Renamed Fly-In' })
			.where(eq(eventsTable.id, EVENT_ID));

		await refresh();

		expect(larry.edited[0].content).toContain('# [Renamed Fly-In]');
		expect(larry.roleSyncs[1].roles[0].name).toBe('Event: Renamed Fly-In');
	});

	it('moves the roster to a second message when it outgrows the first, and back', async () => {
		await send('x'.repeat(DISCORD_LIMIT - 300));
		const extra = Array.from({ length: 12 }, (_, i) => ({
			eventId: EVENT_ID,
			position: `extra-${i}`,
			userId: null
		}));
		await db.insert(eventPositionsTable).values(extra);

		await refresh();

		expect(larry.sent).toHaveLength(2);
		expect(larry.sent[1].allowedMentions).toEqual({ parse: [] });
		expect((await saved())?.messageIds).toEqual(['message-1', 'message-2']);

		await db.delete(eventPositionsTable).where(eq(eventPositionsTable.eventId, EVENT_ID));
		await refresh();

		expect(larry.deleted).toEqual([
			{ channel: 'controller-announcements', messageId: 'message-2', queued: true }
		]);
		expect((await saved())?.messageIds).toEqual(['message-1']);
	});

	it('never throws, so the roster change that called it still goes through', async () => {
		await send();
		larry = fakeLarry({ links: new Error('Larry is down'), roles: new Error('Larry is down') });

		await expect(refresh()).resolves.toBeUndefined();
	});
});

describe('removeEventRole', () => {
	it("deletes the event's role and forgets the briefing, leaving the post", async () => {
		await send();

		await removeEventRole(binding(), db, EVENT_ID);

		expect(larry.deletedRoles).toEqual([['900000000000000001']]);
		expect(larry.deleted).toEqual([]);
		expect(await saved()).toBeUndefined();
	});

	it('does nothing for an event with no briefing', async () => {
		await removeEventRole(binding(), db, EVENT_ID);

		expect(larry.deletedRoles).toEqual([]);
	});

	it("keeps the briefing when Discord won't delete the role, and never throws", async () => {
		await send();
		larry = fakeLarry({ deleteRoles: 'Missing Permissions' });

		await expect(removeEventRole(binding(), db, EVENT_ID)).resolves.toBeUndefined();
		expect(await saved()).toBeDefined();
	});
});
