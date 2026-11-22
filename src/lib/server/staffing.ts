import type { ChannelSend } from '@indy-center/indy-larry-worker';
import type { StaffingRequest } from '$lib/forms/staffing';

// Larry's SEND_CHANNELS name for the Events Team's channel, where staffing requests go
export const STAFFING_CHANNEL = 'events-team';

const ZULU_DAY = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
});

const zuluDay = (date: Date) => ZULU_DAY.format(date);
const zuluTime = (date: Date) => date.toISOString().slice(11, 16).replace(':', '') + 'Z';
// Discord shows these in each reader's own time zone
const discordTime = (date: Date, style: 'f' | 't') =>
	`<t:${Math.floor(date.getTime() / 1000)}:${style}>`;

/**
 * "Mon, Dec 14, 2026, 1800Z–2200Z", with the end's day when it differs, then the same span as
 * Discord timestamps on a second line.
 */
export function formatEventTime({ start, end }: Pick<StaffingRequest, 'start' | 'end'>) {
	const from = new Date(start);
	const to = new Date(end);
	const sameDay = zuluDay(from) === zuluDay(to);
	const zulu = `${zuluDay(from)}, ${zuluTime(from)}–${sameDay ? '' : `${zuluDay(to)}, `}${zuluTime(to)}`;
	const local = `${discordTime(from, 'f')} to ${discordTime(to, sameDay ? 't' : 'f')} your time`;
	return `${zulu}\n${local}`;
}

/** The Discord message for one request, from the signed-in pilot who sent it. */
export function staffingRequestMessage(
	request: StaffingRequest,
	submitter: { name: string; cid: string | number }
): ChannelSend {
	const contact = [
		request.email && `Email: ${request.email}`,
		request.discord && `Discord: ${request.discord}`
	].filter(Boolean);

	return {
		channel: STAFFING_CHANNEL,
		embeds: [
			{
				title: `Staffing request: ${request.organization}`,
				description: request.details,
				// Sky, the brand accent
				color: 0x0369a1,
				fields: [
					{ name: 'Event', value: request.eventName, inline: false },
					{ name: 'When', value: formatEventTime(request), inline: false },
					{ name: 'Airports', value: request.airports, inline: true },
					{ name: 'Expected pilots', value: String(request.pilotCount ?? ''), inline: true },
					{ name: 'Contact', value: contact.join('\n'), inline: false },
					{ name: 'Submitted by', value: `${submitter.name} (${submitter.cid})`, inline: false }
				]
			}
		],
		buttons: request.link ? [{ label: 'Event page', url: request.link }] : undefined,
		// Text pilots type in must never ping anyone
		allowedMentions: { parse: [] }
	};
}
