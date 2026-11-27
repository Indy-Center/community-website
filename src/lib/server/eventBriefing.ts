import { eq } from 'drizzle-orm';
import type { LinkButton } from '@indy-center/indy-larry-worker';
import {
	eventBriefingsTable,
	eventPositionsTable,
	eventsTable,
	type Event,
	type EventBriefing
} from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { errorMessage, LarryChannel, readLinks, type LarryBinding } from '$lib/server/larry';
import { logger } from '$lib/server/logger';
import { deleteRole } from '$lib/server/eventRoles';
import { shownMember, shownMemberQuery } from '$lib/members';
import type { CmsPosition } from '$lib/types/bookings';
import {
	briefingLength,
	composeBriefing,
	DISCORD_LIMIT,
	fixedLength,
	rosterSections,
	type BriefingEvent,
	type RosterEntry
} from '$lib/utils/briefing';

const CHANNEL = LarryChannel.CONTROLLER_ANNOUNCEMENTS;

// The role's name says what it is, so it can't be mistaken for (or collide with) a real role
const roleName = (event: Pick<Event, 'name'>) => `Event: ${event.name}`.slice(0, 100);

/** A rostered controller: who to give the role, and how the post names them. */
type Holder = { cid: string; name: string };

/** Everything a briefing is built from, fetched together. */
export async function fetchBriefingInputs(db: Database, eventId: string) {
	const [event, positions, briefing] = await Promise.all([
		db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) }),
		db.query.eventPositionsTable.findMany({
			where: eq(eventPositionsTable.eventId, eventId),
			columns: { position: true },
			with: { user: shownMemberQuery }
		}),
		db.query.eventBriefingsTable.findFirst({ where: eq(eventBriefingsTable.eventId, eventId) })
	]);
	return {
		event,
		briefing,
		roster: positions.map(({ position, user }) => ({
			positionId: position,
			holder: user ? { cid: user.cid, name: shownMember(user).name } : null
		}))
	};
}

/** The roster with each position's holder, as `fetchBriefingInputs` and the event page read it. */
export type BriefingRoster = { positionId: string; holder: Holder | null }[];

/** What the post says before the briefing: the event, and the roster's sections. */
export function briefingDraft(
	event: Pick<Event, 'id' | 'name' | 'startTime'>,
	roster: BriefingRoster,
	catalogue: CmsPosition[],
	origin: string
) {
	const entries: RosterEntry[] = roster.map(({ positionId, holder }) => ({
		positionId,
		holder: holder?.name ?? null
	}));
	const briefingEvent: BriefingEvent = {
		name: event.name,
		startTime: event.startTime,
		url: `${origin}/events/${event.id}`
	};
	const sections = rosterSections(entries, catalogue);
	return { briefingEvent, sections, fixed: fixedLength(briefingEvent, sections) };
}

// Each controller once, however many positions they hold
const holdersOf = (roster: BriefingRoster) => [
	...new Map(roster.flatMap(({ holder }) => (holder ? [[holder.cid, holder]] : []))).values()
];

/**
 * The Discord accounts to give the event role, and the names of controllers who won't get it:
 * nothing linked, not in the server, or Larry couldn't say.
 */
async function readDiscordAccounts(larry: LarryBinding, holders: Holder[]) {
	const links = await Promise.all(holders.map((holder) => readLinks(larry, holder.cid)));
	const ids: string[] = [];
	const missed: string[] = [];
	holders.forEach((holder, i) => {
		const discord = links[i]?.discord;
		if (discord && discord.inServer !== false) ids.push(discord.id);
		else missed.push(holder.name);
	});
	return { ids, missed };
}

// Makes the event role's members the roster's, exactly, and gives back its ID
async function syncEventRole(
	larry: LarryBinding,
	event: Pick<Event, 'id' | 'name'>,
	roleId: string | null,
	members: string[]
) {
	const { roles } = await larry.syncRoles({
		roles: [
			{
				key: `event-${event.id}`,
				id: roleId,
				name: roleName(event),
				rename: true,
				members,
				exclusive: true
			}
		]
	});
	const [result] = roles;
	if (!result?.roleId) throw new Error(result?.error ?? 'Larry gave back no role');
	return result.roleId;
}

const briefButtons = (briefUrl: string | null): LinkButton[] =>
	briefUrl ? [{ label: 'Open brief', url: briefUrl }] : [];

/**
 * Brings the posted messages in line with `messages`: edits the ones there are, posts any more
 * (only the first ever pings), and deletes any left over. `now` makes the edits at once, for a
 * manager waiting on them; otherwise they're queued. New messages are always sent at once, since
 * their IDs are needed. Returns the IDs of the post's messages, in order.
 */
async function postMessages(
	larry: LarryBinding,
	messages: string[],
	opts: { postedIds: string[]; roleId: string; briefUrl: string | null; now: boolean }
) {
	const ids: string[] = [];
	for (const [i, content] of messages.entries()) {
		const first = i === 0;
		const message = {
			channel: CHANNEL,
			content,
			buttons: first ? briefButtons(opts.briefUrl) : [],
			// Only the event role pings, and only when the briefing is first posted
			allowedMentions:
				first && opts.postedIds.length === 0 ? { roles: [opts.roleId] } : { parse: [] }
		};
		const messageId = opts.postedIds[i];
		if (messageId) {
			if (opts.now) await larry.editMessage({ ...message, messageId });
			else await larry.enqueueEdit({ ...message, messageId });
			ids.push(messageId);
		} else {
			const sent = await larry.send(message);
			ids.push(sent.messageId);
		}
	}
	for (const messageId of opts.postedIds.slice(messages.length)) {
		if (opts.now) await larry.deleteMessage({ channel: CHANNEL, messageId });
		else await larry.enqueueDelete({ channel: CHANNEL, messageId });
	}
	return ids;
}

async function saveBriefing(db: Database, row: EventBriefing) {
	await db
		.insert(eventBriefingsTable)
		.values(row)
		.onConflictDoUpdate({ target: eventBriefingsTable.eventId, set: row });
}

export type SendBriefingResult =
	| { ok: true; missed: string[] }
	| { ok: false; status: number; message: string };

/**
 * Posts an event's briefing in #controller-announcements, pinging the event's role, or updates the
 * post if it's already out. The role is synced to the roster first, so the ping reaches them.
 * `missed` names the rostered controllers the role couldn't reach.
 */
export async function sendBriefing(
	larry: LarryBinding | undefined,
	db: Database,
	catalogue: CmsPosition[],
	eventId: string,
	input: { text: string; briefUrl: string | null },
	origin: string
): Promise<SendBriefingResult> {
	if (!larry) return { ok: false, status: 503, message: "Discord isn't connected right now." };

	const { event, briefing, roster } = await fetchBriefingInputs(db, eventId);
	if (!event) return { ok: false, status: 404, message: 'Event not found.' };
	// The cron deletes an ended event's role; a briefing now would only make it again
	if (event.endTime <= new Date()) {
		return { ok: false, status: 400, message: 'This event has ended, so it takes no briefing.' };
	}

	const text = input.text.replace(/\r\n?/g, '\n').trim();
	const { briefingEvent, sections, fixed } = briefingDraft(event, roster, catalogue, origin);
	const over = briefingLength(fixed, text) - DISCORD_LIMIT;
	if (over > 0) {
		return {
			ok: false,
			status: 400,
			message: `The briefing is ${over} characters too long for one Discord message. Shorten it and send again.`
		};
	}

	const { ids, missed } = await readDiscordAccounts(larry, holdersOf(roster));

	let roleId: string;
	try {
		roleId = await syncEventRole(larry, event, briefing?.roleId ?? null, ids);
	} catch (error) {
		logger.error(`Couldn't sync the role for event ${eventId}`, error);
		return {
			ok: false,
			status: 502,
			message: `Couldn't set up the event's Discord role, so nothing was posted: ${errorMessage(error)}`
		};
	}

	let messageIds: string[];
	try {
		messageIds = await postMessages(larry, composeBriefing(briefingEvent, roleId, text, sections), {
			postedIds: briefing?.messageIds ?? [],
			roleId,
			briefUrl: input.briefUrl,
			now: true
		});
	} catch (error) {
		logger.error(`Couldn't post the briefing for event ${eventId}`, error);
		return {
			ok: false,
			status: 502,
			message: `Discord didn't take the briefing: ${errorMessage(error)}`
		};
	}

	const now = new Date();
	await saveBriefing(db, {
		eventId,
		text,
		briefUrl: input.briefUrl,
		roleId,
		messageIds,
		sentAt: briefing?.sentAt ?? now,
		updatedAt: now
	});
	logger.info(`${briefing ? 'Updated' : 'Posted'} the briefing for event ${eventId}`);
	return { ok: true, missed };
}

/**
 * After a roster or event change: edits a posted briefing to match, and syncs the event role to
 * the roster. Edits ping nobody, so controllers added later get the role quietly. Does nothing
 * when no briefing is out, and never throws, so it can't fail the change that called it.
 */
export async function refreshBriefing(
	larry: LarryBinding | undefined,
	db: Database,
	catalogue: () => Promise<CmsPosition[]>,
	eventId: string,
	origin: string
) {
	try {
		const { event, briefing, roster } = await fetchBriefingInputs(db, eventId);
		if (!event || !briefing) return;
		// Once the event is over, its post stays as it was, and its role is the cron's to delete
		if (event.endTime <= new Date()) return;
		if (!larry) {
			logger.warn(`LARRY binding is not set; the briefing for event ${eventId} is out of date`);
			return;
		}

		const { ids } = await readDiscordAccounts(larry, holdersOf(roster));
		let roleId = briefing.roleId;
		try {
			roleId = await syncEventRole(larry, event, roleId, ids);
		} catch (error) {
			logger.error(`Couldn't sync the role for event ${eventId}`, error);
		}

		const { briefingEvent, sections } = briefingDraft(event, roster, await catalogue(), origin);
		const messages = composeBriefing(briefingEvent, roleId, briefing.text, sections);
		if (messages[0].length > DISCORD_LIMIT) {
			logger.warn(`The briefing for event ${eventId} no longer fits a message; not edited`);
			return;
		}

		const messageIds = await postMessages(larry, messages, {
			postedIds: briefing.messageIds,
			roleId: roleId ?? '',
			briefUrl: briefing.briefUrl,
			now: false
		});
		await db
			.update(eventBriefingsTable)
			.set({ roleId, messageIds, updatedAt: new Date() })
			.where(eq(eventBriefingsTable.eventId, eventId));
	} catch (error) {
		logger.error(`Couldn't update the briefing for event ${eventId}`, error);
	}
}

/**
 * An event is being deleted: deletes its Discord role, for everyone who holds it, and forgets its
 * briefing. The post stays in the channel. Never throws, so it can't stop the event's deletion.
 */
export async function removeEventRole(
	larry: LarryBinding | undefined,
	db: Database,
	eventId: string
) {
	try {
		const briefing = await db.query.eventBriefingsTable.findFirst({
			where: eq(eventBriefingsTable.eventId, eventId)
		});
		if (!briefing) return;

		if (briefing.roleId) {
			if (!larry) {
				logger.warn(`LARRY binding is not set; the role for event ${eventId} was left in Discord`);
				return;
			}
			await deleteRole(larry, briefing.roleId);
			logger.info(`Deleted the Discord role for event ${eventId}`);
		}
		await db.delete(eventBriefingsTable).where(eq(eventBriefingsTable.eventId, eventId));
	} catch (error) {
		logger.error(`Couldn't delete the Discord role for event ${eventId}`, error);
	}
}
