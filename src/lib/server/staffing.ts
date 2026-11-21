import type { ChannelSend } from '@indy-center/indy-larry-worker';
import type { StaffingRequest } from '$lib/forms/staffing';

// Larry's SEND_CHANNELS name for the channel staffing requests go to. Beta testing for now;
// point it at the events team's channel once the page is live.
export const STAFFING_CHANNEL = 'beta-testing';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
});

/** "Sat, Dec 14, 2026 · 1800–2200z" from the form's date and HH:MM times. */
export function formatEventTime({ date, startTime, endTime }: StaffingRequest) {
	const zulu = (time: string) => time.replace(':', '');
	return `${DATE_FORMAT.format(new Date(`${date}T00:00:00Z`))} · ${zulu(startTime)}–${zulu(endTime)}z`;
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
				color: 0x0ea5e9,
				fields: [
					{ name: 'Event', value: request.eventName, inline: false },
					{ name: 'When', value: formatEventTime(request), inline: false },
					{ name: 'Airports', value: request.airports, inline: true },
					{ name: 'Expected pilots', value: String(request.pilotCount), inline: true },
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
