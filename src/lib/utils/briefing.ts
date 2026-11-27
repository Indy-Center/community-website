import { parseCallsign } from '@indy-center/centerline-svelte';
import { FACILITY_ID } from '$lib/config';
import type { CmsPosition } from '$lib/types/bookings';

// An event briefing as Larry posts it in Discord: the event role's ping, the event's name and start,
// the manager's briefing, then the roster, facility by facility. It must fit one Discord message
// when sent; the roster moves to messages of its own if it later outgrows that.

/** Discord's limit on a message's content. */
export const DISCORD_LIMIT = 2000;

// `<@&id>`: Discord IDs run to 20 digits. Counted before the role exists, so the briefing is
// always measured against the longest ping it could carry.
const PING_PLACEHOLDER = `<@&${'0'.repeat(20)}>`;

// Positions in a facility, from the top down; any other type after these
const TYPE_ORDER = ['CTR', 'APP', 'DEP', 'TWR', 'GND', 'DEL', 'RMP'];

/** One position on the roster, and who holds it (their name as the site shows it), if anyone. */
export type RosterEntry = { positionId: string; holder: string | null };

/** What the post says about the event itself. */
export type BriefingEvent = { name: string; startTime: Date; url: string };

/**
 * Text a member typed, made safe to post: mass and user/role mentions are broken with a
 * zero-width space so they show but never ping. Line endings are made Discord's, so what a
 * browser counts and what is posted are the same length.
 */
export function escapeMentions(text: string) {
	return text
		.replace(/\r\n?/g, '\n')
		.replace(/@(everyone|here)/g, '@​$1')
		.replace(/<@/g, '<​@');
}

/** The briefing a manager typed, as it is posted. */
export const cleanBriefing = (text: string) => escapeMentions(text).trim();

const typeRank = (callsign: string) => {
	const rank = TYPE_ORDER.indexOf(parseCallsign(callsign)?.type ?? '');
	return rank === -1 ? TYPE_ORDER.length : rank;
};

/**
 * The roster as the post lists it: one section per facility, the center first and then the
 * rest alphabetically, each position on its own line by its short name. Positions the catalogue
 * doesn't know go last, under "Other", by their ID.
 */
export function rosterSections(entries: RosterEntry[], catalogue: CmsPosition[]): string[] {
	const OTHER = 'Other';
	const facilities = new Map<string, { callsign: string; line: string }[]>();

	for (const { positionId, holder } of entries) {
		const position = catalogue.find((p) => p.id === positionId);
		const facility = position?.facility.id ?? OTHER;
		const label = position ? (position.shortName ?? position.callsign) : positionId;
		const line = `${escapeMentions(label)} - ${holder ? escapeMentions(holder) : 'Vacant'}`;
		const lines = facilities.get(facility) ?? [];
		lines.push({ callsign: position?.callsign ?? positionId, line });
		facilities.set(facility, lines);
	}

	const facilityRank = (id: string) => (id === FACILITY_ID ? 0 : id === OTHER ? 2 : 1);
	return [...facilities]
		.sort(([a], [b]) => facilityRank(a) - facilityRank(b) || a.localeCompare(b))
		.map(([facility, lines]) => {
			const sorted = lines
				.sort(
					(a, b) =>
						typeRank(a.callsign) - typeRank(b.callsign) || a.callsign.localeCompare(b.callsign)
				)
				.map(({ line }) => line);
			return [`## __${facility}__`, ...sorted].join('\n');
		});
}

function header(event: BriefingEvent, ping: string | null) {
	const unix = Math.floor(event.startTime.getTime() / 1000);
	// Brackets would end the link's text early
	const name = escapeMentions(event.name).replace(/[[\]]/g, '\\$&');
	return [
		...(ping ? [ping] : []),
		`# [${name}](<${event.url}>)`,
		`Event starts at <t:${unix}:f> (<t:${unix}:R>)`
	].join('\n');
}

const join = (parts: string[]) => parts.filter(Boolean).join('\n\n');

/** How long the post is before the manager types anything, with room for the role's ping. */
export const fixedLength = (event: BriefingEvent, sections: string[]) =>
	join([header(event, PING_PLACEHOLDER), sections.join('\n')]).length;

/** How long the post is with this briefing. The browser's counter and the server both use it. */
export function briefingLength(fixed: number, text: string) {
	const cleaned = cleanBriefing(text);
	return cleaned ? fixed + cleaned.length + 2 : fixed;
}

// Lines packed into messages that each fit Discord's limit
function pack(lines: string[]) {
	const messages: string[] = [];
	let current = '';
	for (const line of lines) {
		const next = current ? `${current}\n${line}` : line;
		if (next.length <= DISCORD_LIMIT || !current) {
			current = next;
		} else {
			messages.push(current);
			current = line;
		}
	}
	if (current) messages.push(current);
	return messages;
}

/**
 * The post's messages: one, or when the roster no longer fits beside the briefing, the briefing
 * and then the roster in as many messages as it needs. `text` is the briefing as the manager typed it.
 */
export function composeBriefing(
	event: BriefingEvent,
	roleId: string | null,
	text: string,
	sections: string[]
): string[] {
	const top = header(event, roleId ? `<@&${roleId}>` : null);
	const briefing = cleanBriefing(text);
	const whole = join([top, briefing, sections.join('\n')]);
	if (whole.length <= DISCORD_LIMIT) return [whole];

	// Whole sections where they fit, so a facility only splits when it alone is too long
	const rosterMessages: string[] = [];
	for (const section of sections) {
		const last = rosterMessages.at(-1);
		if (last !== undefined && `${last}\n${section}`.length <= DISCORD_LIMIT) {
			rosterMessages[rosterMessages.length - 1] = `${last}\n${section}`;
		} else {
			rosterMessages.push(...pack(section.split('\n')));
		}
	}
	return [join([top, briefing]), ...rosterMessages];
}
