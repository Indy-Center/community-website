import { CREDENTIAL_LADDER } from '$lib/config/bookings';
import type { AtcBooking, WorkerPosition } from '$lib/types/bookings';

export type PositionType = 'ARTCC' | 'TRACON' | 'ATCT';

export const POSITION_TYPES: PositionType[] = ['ARTCC', 'TRACON', 'ATCT'];

export type BookablePosition = {
	callsign: string;
	name: string;
	radioName: string;
	type: PositionType;
	// The facility the position belongs to; the picker groups on it
	facility: { id: string; name: string };
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

export type PositionLabel = { title: string; detail: string | null };

// Centers go by sector name alone ("Falmouth 83"); everything else by radio name with the
// position name as detail ("Columbus Tower", "Local Control East")
export function getPositionLabel(position: {
	callsign: string;
	radioName: string;
	name: string;
}): PositionLabel {
	return getPositionType(position.callsign) === 'ARTCC'
		? { title: position.name, detail: null }
		: { title: position.radioName, detail: position.name };
}

// Labels for the positions in the feed, keyed by callsign
export function getPositionLabels(positions: WorkerPosition[]): Record<string, PositionLabel> {
	return Object.fromEntries(
		positions.map((position) => [position.callsign, getPositionLabel(position)])
	);
}

// One-line form for titles and dialogs, falling back to the callsign
export function describePosition(callsign: string, label: PositionLabel | undefined) {
	if (!label) return callsign;
	return label.detail ? `${label.title} · ${label.detail}` : label.title;
}

// Whether held credentials meet a position's requirements: every entry must be met, and an entry
// is met by holding any one of its credentials or a higher one on the ladder. The booking system
// makes the final decision; this only hides positions the controller can't book.
export function meetsRequirements(
	position: Pick<WorkerPosition, 'requiredCredentials'>,
	certification: string | null,
	endorsements: string[]
) {
	const held = [...(certification ? [certification] : []), ...endorsements];
	const rank = (code: string) => CREDENTIAL_LADDER.indexOf(code);

	const holds = (code: string) =>
		held.some((have) => have === code || (rank(code) !== -1 && rank(have) >= rank(code)));

	return position.requiredCredentials.every(({ anyOf }) => anyOf.some(holds));
}

// The feed's positions this controller may book, in the feed's order. Positions with a callsign
// we can't place in a position type are left out.
export function getBookablePositions(
	positions: WorkerPosition[],
	certification: string | null,
	endorsements: string[]
): BookablePosition[] {
	return positions.flatMap((position) => {
		const type = getPositionType(position.callsign);
		if (!type || !meetsRequirements(position, certification, endorsements)) return [];

		return [
			{
				callsign: position.callsign,
				name: position.name,
				radioName: position.radioName,
				type,
				facility: { id: position.facility.id, name: position.facility.name }
			}
		];
	});
}

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

// A pending booking as the list shows it. It has no number from the booking system yet.
export type PendingRow = {
	externalId: string;
	callsign: string;
	cid: string;
	start: Date;
	end: Date;
	createdAt: Date;
};

// How long a booking may stay pending before it is taken as refused by the booking system
export const PENDING_MAX_MINUTES = 10;

// The list with pending bookings added, and the pending rows that are done: now in the list, or
// too old. A pending row is only a stand-in until the real booking shows up.
export function mergePendingBookings(bookings: AtcBooking[], rows: PendingRow[], now: Date) {
	const listed = new Set(bookings.flatMap((booking) => booking.externalId ?? []));
	const oldest = now.getTime() - PENDING_MAX_MINUTES * 60000;
	const isDone = (row: PendingRow) =>
		listed.has(row.externalId) || row.createdAt.getTime() < oldest;

	const pending = rows
		.filter((row) => !isDone(row))
		.map(
			(row): AtcBooking => ({
				id: -1,
				externalId: row.externalId,
				callsign: row.callsign,
				cid: Number(row.cid),
				type: 'booking',
				start: formatBookingTime(row.start),
				end: formatBookingTime(row.end),
				pending: true
			})
		);

	return {
		bookings: sortBookings([...bookings, ...pending]),
		doneIds: rows.filter(isDone).map((row) => row.externalId)
	};
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
