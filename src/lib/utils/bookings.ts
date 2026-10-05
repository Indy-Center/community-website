import {
	ADVANCED_FIELDS,
	EXTRA_PRIMARY_POSITIONS,
	UNBOOKABLE_POSITIONS
} from '$lib/config/bookings';
import { getCertificationOrder } from '$lib/config/certifications';
import type { AtcBooking } from '$lib/types/bookings';
import type { VnasFacility } from '$lib/types/vnas';

type FacilityNode = {
	id: string;
	childFacilities: FacilityNode[];
	positions: { callsign: string; name: string; radioName: string; starred: boolean }[];
};

export type PositionType = 'ARTCC' | 'TRACON' | 'ATCT';

export const POSITION_TYPES: PositionType[] = ['ARTCC', 'TRACON', 'ATCT'];

export type BookablePosition = {
	callsign: string;
	name: string;
	radioName: string;
	type: PositionType;
	primary: boolean;
	// Owning facility is IND, CVG, SDF or CMH; the picker splits ATCT positions on this
	advanced: boolean;
};

// VnasFacility types top-level positions with the controller-feed shape, but the ARTCC
// endpoint returns this shape at every level
const asFacilityNode = (facility: VnasFacility) => facility as unknown as FacilityNode;

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

// Every facility ID under the ARTCC (ZID, IND, SDF, CVG, ...) is a callsign prefix we own
export function getCallsignPrefixes(facility: VnasFacility): string[] {
	const walk = (f: FacilityNode): string[] => [f.id, ...f.childFacilities.flatMap(walk)];

	return walk(asFacilityNode(facility));
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

// Labels for every position in the ARTCC, keyed by callsign
export function getPositionLabels(facility: VnasFacility): Record<string, PositionLabel> {
	const walk = (f: FacilityNode): [string, PositionLabel][] => [
		...f.positions.map((position): [string, PositionLabel] => [
			position.callsign,
			getPositionLabel(position)
		]),
		...f.childFacilities.flatMap(walk)
	];

	return Object.fromEntries(walk(asFacilityNode(facility)));
}

// One-line form for titles and dialogs, falling back to the callsign
export function describePosition(callsign: string, label: PositionLabel | undefined) {
	if (!label) return callsign;
	return label.detail ? `${label.title} · ${label.detail}` : label.title;
}

export function getBookablePositions(facility: VnasFacility): BookablePosition[] {
	const walk = (f: FacilityNode): BookablePosition[] => [
		...f.positions.flatMap((position) => {
			const type = getPositionType(position.callsign);
			const primary = position.starred || EXTRA_PRIMARY_POSITIONS.includes(position.callsign);
			// Every center sector is bookable; elsewhere only the primary positions
			const bookable = primary || type === 'ARTCC';
			if (!type || !bookable || UNBOOKABLE_POSITIONS.test(position.callsign)) {
				return [];
			}
			return [
				{
					callsign: position.callsign,
					name: position.name,
					radioName: position.radioName,
					type,
					primary,
					advanced: ADVANCED_FIELDS.includes(f.id)
				}
			];
		}),
		...f.childFacilities.flatMap(walk)
	];

	const unique = new Map(
		walk(asFacilityNode(facility)).map((position) => [position.callsign, position])
	);

	// Primary positions first, e.g. Falmouth 83 heads the center list
	return [...unique.values()].sort(
		(a, b) => Number(b.primary) - Number(a.primary) || a.callsign.localeCompare(b.callsign)
	);
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

export function filterFacilityBookings(bookings: AtcBooking[], prefixes: string[]) {
	const prefixSet = new Set(prefixes);

	return bookings
		.filter((booking) => prefixSet.has(booking.callsign.split('_')[0]))
		.sort((a, b) => a.start.localeCompare(b.start));
}

// A controller holds one certification (their highest) plus any endorsements
export function canBookPosition(
	callsign: string,
	certification: string | null,
	endorsements: string[]
): boolean {
	const advanced = ADVANCED_FIELDS.includes(callsign.split('_')[0]);
	const atLeast = (cert: string) =>
		certification !== null && getCertificationOrder(certification) >= getCertificationOrder(cert);

	switch (callsignSuffix(callsign)) {
		// S-GC can work clearance anywhere, advanced fields included
		case 'DEL':
			return atLeast('S-GC');
		case 'GND':
		case 'RMP':
			return atLeast(advanced ? 'A-GC' : 'S-GC');
		case 'TWR':
			return (
				atLeast('A-LC') ||
				endorsements.includes('TWR-SOLO') ||
				(!advanced && endorsements.includes('S-LC'))
			);
		case 'APP':
		case 'DEP':
			return atLeast('T-RC') || endorsements.includes('APP-SOLO');
		case 'CTR':
			return endorsements.includes('T2-CTR');
		default:
			return false;
	}
}

// The API returns UTC times without a zone marker
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
