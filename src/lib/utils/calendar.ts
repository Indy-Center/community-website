import type { Event } from '$lib/db/schema/events';

type CalendarEvent = Pick<Event, 'id' | 'name' | 'description' | 'startTime' | 'endTime'>;

// Formats a date as a UTC basic-format timestamp, e.g. 20260924T230000Z
function toCalendarTimestamp(date: Date) {
	return date
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

// URLSearchParams encodes spaces as "+", which some calendar providers show literally
function encodeParams(params: URLSearchParams) {
	return params.toString().replace(/\+/g, '%20');
}

function buildDetails(event: CalendarEvent, eventUrl: string) {
	return `${event.description}\n\nEvent page: ${eventUrl}`;
}

export function getGoogleCalendarUrl(event: CalendarEvent, eventUrl: string) {
	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: event.name,
		dates: `${toCalendarTimestamp(event.startTime)}/${toCalendarTimestamp(event.endTime)}`,
		details: buildDetails(event, eventUrl),
		location: eventUrl
	});

	return `https://calendar.google.com/calendar/render?${encodeParams(params)}`;
}

export function getOutlookCalendarUrl(event: CalendarEvent, eventUrl: string) {
	const params = new URLSearchParams({
		path: '/calendar/action/compose',
		rru: 'addevent',
		subject: event.name,
		startdt: event.startTime.toISOString(),
		enddt: event.endTime.toISOString(),
		body: buildDetails(event, eventUrl),
		location: eventUrl
	});

	return `https://outlook.live.com/calendar/0/action/compose?${encodeParams(params)}`;
}

// Escapes text values per RFC 5545 section 3.3.11
function escapeIcsText(value: string) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

// Folds content lines longer than 75 octets per RFC 5545 section 3.1
function foldIcsLine(line: string) {
	const encoder = new TextEncoder();
	const chunks: string[] = [];
	let current = '';
	let currentBytes = 0;

	for (const char of line) {
		const charBytes = encoder.encode(char).length;
		// Continuation lines start with a space, which counts towards the limit
		const limit = chunks.length === 0 ? 75 : 74;

		if (currentBytes + charBytes > limit) {
			chunks.push(current);
			current = '';
			currentBytes = 0;
		}

		current += char;
		currentBytes += charBytes;
	}
	chunks.push(current);

	return chunks.join('\r\n ');
}

export function buildIcsFile(event: CalendarEvent, eventUrl: string, host: string) {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Indy Center//Events//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${event.id}@${host}`,
		`DTSTAMP:${toCalendarTimestamp(new Date())}`,
		`DTSTART:${toCalendarTimestamp(event.startTime)}`,
		`DTEND:${toCalendarTimestamp(event.endTime)}`,
		`SUMMARY:${escapeIcsText(event.name)}`,
		`DESCRIPTION:${escapeIcsText(buildDetails(event, eventUrl))}`,
		`LOCATION:${escapeIcsText(eventUrl)}`,
		`URL:${eventUrl}`,
		'END:VEVENT',
		'END:VCALENDAR'
	];

	return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}
