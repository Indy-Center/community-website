import {
	CREDENTIAL_LADDER,
	EXTRA_PRIMARY_POSITIONS,
	MENTOR_ROLES,
	SIMPLE_ATCT_FACILITIES,
	UNBOOKABLE_POSITIONS
} from '$lib/config/bookings';
import type { AtcBooking, CmsPosition } from '$lib/types/bookings';
import type { VnasFacility } from '$lib/types/vnas';

export type PositionType = 'ARTCC' | 'TRACON' | 'ATCT';

export const POSITION_TYPES: PositionType[] = ['ARTCC', 'TRACON', 'ATCT'];

// What people call each type; nobody says ARTCC
export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
	ARTCC: 'Center',
	TRACON: 'TRACON',
	ATCT: 'ATCT'
};

// Facility names from the CMS say "ARTCC" too
export const plainFacilityName = (name: string) => name.replace(/ARTCC/g, 'Center');

// Event rosters book their controllers under IDs like ev_<event id>_<16 hex digits>, so /bookings
// can tell they are managed from the event, and which event
export const EVENT_BOOKING_PREFIX = 'ev_';

export function eventIdOf(externalId: string | null | undefined) {
	return /^ev_(.+)_[0-9a-f]{16}$/.exec(externalId ?? '')?.[1] ?? null;
}

// An event with this many bookings or more shows as one block instead of one per position
export const EVENT_GROUP_MIN = 4;

type FacilityNode = {
	childFacilities: FacilityNode[];
	positions: { id: string; callsign: string }[];
};

// Callsign by vNAS position ID, for every position in the ARTCC. Event positions are stored by ID.
export function getPositionCallsigns(facility: VnasFacility): Record<string, string> {
	const walk = (f: FacilityNode): [string, string][] => [
		...f.positions.map((position): [string, string] => [position.id, position.callsign]),
		...f.childFacilities.flatMap(walk)
	];

	return Object.fromEntries(walk(facility as unknown as FacilityNode));
}

export type BookablePosition = {
	callsign: string;
	name: string;
	radioName: string;
	type: PositionType;
	// The facility's main position; these head their list
	primary: boolean;
	// The facility the position belongs to, and its parent (e.g. Anderson under Indianapolis)
	facility: { id: string; name: string; parent: { id: string; name: string } | null };
};

const callsignSuffix = (callsign: string) => callsign.split('_').at(-1) ?? '';

export function getPositionType(callsign: string): PositionType | null {
	switch (callsignSuffix(callsign)) {
		case 'CTR':
			return 'ARTCC';
		case 'APP':
		case 'DEP':
			return 'TRACON';
		case 'DEL':
		case 'GND':
		case 'RMP':
		case 'TWR':
			return 'ATCT';
		default:
			return null;
	}
}

/**
 * A catalogue position in words, for where Centerline's `Position` can't go: a confirm dialog, an
 * aria-label, a Discord message. The same parts in the same order as `Position` inline: radio name,
 * short name, sector ("Indy Center · FLM 83 · Falmouth 83"), with no frequency. With no position
 * found, the callsign alone, as `Position` shows an unknown one. Everywhere else, use
 * `<Position callsign>`.
 *
 * Takes the position already found, so this file never imports Centerline: the cron Worker
 * (src/worker.ts) is bundled outside SvelteKit, where Centerline can't be resolved. Pages find it
 * with `positionText` in `$lib/positionText`; the cron matches the callsign exactly.
 */
export function formatPosition(
	found: Pick<CmsPosition, 'callsign' | 'radioName' | 'shortName' | 'name'> | undefined,
	callsign: string
) {
	if (!found) return callsign;
	return [found.radioName, found.shortName ?? found.callsign, found.name]
		.filter((part, i, parts) => part && parts.indexOf(part) === i)
		.join(' · ');
}

// Whether VATUSA facility roles make someone a mentor (MENTOR_ROLES)
export const isMentor = (roles: string[]) => roles.some((role) => MENTOR_ROLES.includes(role));

type Requirements = CmsPosition['requiredCredentials'];

const isSimpleAtct = (callsign: string) =>
	SIMPLE_ATCT_FACILITIES.includes(callsign.split('_')[0] ?? '');

/**
 * What a position requires by our SOP, from its callsign. Null for a position these rules don't
 * cover (TMU, say), which keeps whatever the CMS says.
 *
 * TODO: here only until the CMS positions feed follows SOP 3.20; see SIMPLE_ATCT_FACILITIES.
 */
export function getSopRequirements(callsign: string): Requirements | null {
	switch (callsignSuffix(callsign)) {
		case 'DEL':
			return [{ anyOf: ['S-GC'] }];
		case 'GND':
		case 'RMP':
			return [{ anyOf: [isSimpleAtct(callsign) ? 'S-GC' : 'A-GC'] }];
		case 'TWR':
			return [{ anyOf: [isSimpleAtct(callsign) ? 'S-LC' : 'A-LC'] }];
		case 'APP':
		case 'DEP':
			return [{ anyOf: ['T-RC'] }];
		case 'CTR':
			return [{ anyOf: ['E-RC'] }, { anyOf: ['T2-CTR'] }];
		default:
			return null;
	}
}

// The CMS feed with our SOP's requirements in place of its own, wherever the SOP covers the position
export const withSopRequirements = (positions: CmsPosition[]): CmsPosition[] =>
	positions.map((position) => ({
		...position,
		requiredCredentials: getSopRequirements(position.callsign) ?? position.requiredCredentials
	}));

// Whether held credentials meet a position's requirements: every entry must be met, and an entry
// is met by holding any one of its credentials or a higher one on the ladder. The booking system
// makes the final decision; this only hides positions the controller can't book.
export function meetsRequirements(
	position: Pick<CmsPosition, 'requiredCredentials'>,
	certification: string | null,
	endorsements: string[]
) {
	const held = [...(certification ? [certification] : []), ...endorsements];
	const rank = (code: string) => CREDENTIAL_LADDER.indexOf(code);

	const holds = (code: string) =>
		held.some((have) => have === code || (rank(code) !== -1 && rank(have) >= rank(code)));

	return position.requiredCredentials.every(({ anyOf }) => anyOf.some(holds));
}

// The feed's positions this controller may book, primary ones first and otherwise in the feed's
// order. Emergency positions and ones with a callsign we can't place in a position type are left
// out.
export function getBookablePositions(
	positions: CmsPosition[],
	certification: string | null,
	endorsements: string[]
): BookablePosition[] {
	const bookable = positions.flatMap((position) => {
		const type = getPositionType(position.callsign);
		if (
			!type ||
			UNBOOKABLE_POSITIONS.test(position.callsign) ||
			!meetsRequirements(position, certification, endorsements)
		) {
			return [];
		}

		return [
			{
				callsign: position.callsign,
				name: position.name,
				radioName: position.radioName,
				type,
				primary: position.starred === true || EXTRA_PRIMARY_POSITIONS.includes(position.callsign),
				facility: position.facility
			}
		];
	});

	// Array.sort is stable, so the feed's order holds within each half
	return bookable.sort((a, b) => Number(b.primary) - Number(a.primary));
}

export type PositionGroup = {
	// The top-level facility: a field's parent, or the facility itself when it has none
	label: string;
	facilities: { id: string; label: string; positions: BookablePosition[] }[];
};

// Positions under their facility, and facilities under their parent, e.g. Anderson and Columbus
// under Indianapolis ATCT/TRACON. Both levels sort by name; positions keep the order they came in.
export function groupPositions(positions: BookablePosition[]): PositionGroup[] {
	const groups = new Map<string, Map<string, PositionGroup['facilities'][number]>>();

	for (const position of positions) {
		const top = position.facility.parent ?? position.facility;
		const facilities = groups.get(top.name) ?? new Map();
		const facility = facilities.get(position.facility.id) ?? {
			id: position.facility.id,
			label: position.facility.name,
			positions: []
		};
		facility.positions.push(position);
		facilities.set(position.facility.id, facility);
		groups.set(top.name, facilities);
	}

	return [...groups]
		.map(([label, facilities]) => ({
			label,
			facilities: [...facilities.values()]
				.map((facility) => ({
					...facility,
					positions: [...facility.positions].sort(
						(a, b) => positionRank(a.callsign) - positionRank(b.callsign)
					)
				}))
				.sort((a, b) => a.label.localeCompare(b.label))
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
}

// The picker lists primary positions, plus everything when asked. Every Center sector is listed
// regardless, as there are too many sectors to call most of them secondary.
export const isListed = (position: BookablePosition, showAll: boolean) =>
	showAll || position.primary || position.type === 'ARTCC';

export function searchPositions(positions: BookablePosition[], query: string) {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

	return positions.filter((position) => {
		const haystack = [
			position.callsign,
			position.callsign.replaceAll('_', ' '),
			position.radioName,
			position.name
		]
			.join(' ')
			.toLowerCase();
		return terms.every((term) => haystack.includes(term));
	});
}

export const sortBookings = (bookings: AtcBooking[]) =>
	[...bookings].sort((a, b) => a.start.localeCompare(b.start));

// Where a position sits on a roster, by the end of its callsign: TMU on top, then Center,
// Approach and Departure, Tower, Ground, Ramp and Clearance. Anything else goes last.
const POSITION_ORDER = [['TMU'], ['CTR'], ['APP', 'DEP'], ['TWR'], ['GND'], ['RMP'], ['DEL']];

export function positionRank(callsign: string) {
	const index = POSITION_ORDER.findIndex((suffixes) => suffixes.includes(callsignSuffix(callsign)));
	return index === -1 ? POSITION_ORDER.length : index;
}

export const comparePositions = (a: string, b: string) =>
	positionRank(a) - positionRank(b) || a.localeCompare(b);

// Folds each event's bookings into one stand-in booking once there are `min` or more of them, so
// an event with twenty positions is one block, not twenty. Everything else is left as it was.
// `eventNames` is by event ID; an event we have no name for is called "Event".
export function groupEventBookings(
	bookings: AtcBooking[],
	eventNames: Record<string, string>,
	min = EVENT_GROUP_MIN
) {
	const byEvent = new Map<string, AtcBooking[]>();
	for (const booking of bookings) {
		const eventId = eventIdOf(booking.externalId);
		if (eventId) byEvent.set(eventId, [...(byEvent.get(eventId) ?? []), booking]);
	}

	const grouped = new Set<AtcBooking>();
	const stands = [...byEvent]
		.filter(([, members]) => members.length >= min)
		.map(([eventId, members]): AtcBooking => {
			members.forEach((member) => grouped.add(member));
			const sorted = sortBookings(members);
			// The panel lists them in roster order
			const roster = [...members].sort((a, b) => comparePositions(a.callsign, b.callsign));

			return {
				id: -1,
				externalId: `group:${eventId}`,
				callsign: '',
				cid: 0,
				type: 'event',
				start: sorted[0].start,
				end:
					members
						.map((member) => member.end)
						.sort()
						.at(-1) ?? sorted[0].end,
				group: { eventId, name: eventNames[eventId] ?? 'Event', members: roster }
			};
		});

	return sortBookings([...bookings.filter((booking) => !grouped.has(booking)), ...stands]);
}

// Bookings carry UTC times without a zone marker; the API client converts from its ISO 8601
export function parseBookingTime(time: string) {
	return new Date(time.replace(' ', 'T') + 'Z');
}

export function formatBookingTime(date: Date) {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

export type CalendarSegment = {
	booking: AtcBooking;
	// Minutes from 00z on this day
	startMinute: number;
	endMinute: number;
	// Overlapping segments share the column side by side
	lane: number;
	lanes: number;
};

const DAY_MS = 86400000;

export function startOfUtcDay(date: Date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getWeekDays(weekStart: Date) {
	return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
}

// Splits bookings into per-day segments (cutting at midnight) and assigns overlap lanes
export function layoutCalendarDay(bookings: AtcBooking[], day: Date): CalendarSegment[] {
	const dayStart = day.getTime();
	const dayEnd = dayStart + DAY_MS;

	const segments = bookings
		.map((booking) => ({
			booking,
			start: Math.max(parseBookingTime(booking.start).getTime(), dayStart),
			end: Math.min(parseBookingTime(booking.end).getTime(), dayEnd)
		}))
		.filter((segment) => segment.start < segment.end)
		.sort((a, b) => a.start - b.start || b.end - a.end);

	const laidOut: CalendarSegment[] = [];
	let cluster: CalendarSegment[] = [];
	let clusterEnd = 0;
	let laneEnds: number[] = [];

	const closeCluster = () => {
		cluster.forEach((segment) => (segment.lanes = laneEnds.length));
		cluster = [];
		laneEnds = [];
	};

	for (const { booking, start, end } of segments) {
		if (start >= clusterEnd) closeCluster();

		let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
		if (lane === -1) lane = laneEnds.length;
		laneEnds[lane] = end;
		clusterEnd = Math.max(clusterEnd, end);

		const segment = {
			booking,
			startMinute: (start - dayStart) / 60000,
			endMinute: (end - dayStart) / 60000,
			lane,
			lanes: 1
		};
		cluster.push(segment);
		laidOut.push(segment);
	}
	closeCluster();

	return laidOut;
}

// Bookings whose reminder falls in this cron run. The window matches the cron interval, so
// each booking lands in exactly one run without having to remember who was already reminded.
export function getDueReminders(
	bookings: AtcBooking[],
	runTime: Date,
	leadHours: number,
	windowMinutes: number
) {
	const windowStart = runTime.getTime() + leadHours * 3600000;
	const windowEnd = windowStart + windowMinutes * 60000;

	return bookings.filter((booking) => {
		const start = parseBookingTime(booking.start).getTime();
		return start >= windowStart && start < windowEnd;
	});
}

// Bookings that start within the next `leadHours`, soonest first. Once one starts the controller
// is on the network, so it drops off.
export function getUpcomingBookings(bookings: AtcBooking[], now: Date, leadHours: number) {
	const windowEnd = now.getTime() + leadHours * 3600000;

	return sortBookings(
		bookings.filter((booking) => {
			const start = parseBookingTime(booking.start).getTime();
			return start > now.getTime() && start <= windowEnd;
		})
	);
}

// Back-to-back bookings (one ends as the next starts) don't overlap
const overlaps = (booking: AtcBooking, start: Date, end: Date) =>
	parseBookingTime(booking.start) < end && parseBookingTime(booking.end) > start;

// Existing booking on this position that clashes with start–end, ignoring the one being edited
export function findBookingConflict(
	bookings: AtcBooking[],
	callsign: string,
	start: Date,
	end: Date,
	ignoreId?: number
) {
	return bookings.find(
		(booking) =>
			booking.callsign === callsign && booking.id !== ignoreId && overlaps(booking, start, end)
	);
}

// Positions already booked at some point between start and end, keyed by callsign
export function getBookedPositions(bookings: AtcBooking[], start: Date, end: Date) {
	return new Map(
		bookings
			.filter((booking) => overlaps(booking, start, end))
			.map((booking) => [booking.callsign, booking])
	);
}

// "1900–2200z", for conflict messages
export function formatZuluRange(booking: AtcBooking) {
	const hhmm = (time: string) =>
		parseBookingTime(time).toISOString().slice(11, 16).replace(':', '');
	return `${hhmm(booking.start)}–${hhmm(booking.end)}z`;
}
