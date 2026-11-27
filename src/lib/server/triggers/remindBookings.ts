import {
	BOOKING_COORDINATE_MINUTES,
	BOOKING_FINAL_REMINDER_MINUTES,
	BOOKING_REMINDER_HOURS,
	BOOKINGS_URL
} from '$lib/config/bookings';
import { logger } from '$lib/server/logger';
import { fetchRosterDiscordIds } from '$lib/server/vatsim/vatusaDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient';
import type { PositionsReader } from '$lib/server/positions';
import type { AtcBooking, BookingsClient, CmsPosition } from '$lib/types/bookings';
import type { VnasController } from '$lib/types/vnas';
import {
	findPositionController,
	formatPosition,
	getDueReminders,
	parseBookingTime
} from '$lib/utils/bookings';

// Matches the "0-59/5 * * * *" cron in wrangler.jsonc
const CRON_INTERVAL_MINUTES = 5;

const unix = (time: string) => Math.floor(parseBookingTime(time).getTime() / 1000);

const changePlans = `If your plans have changed, please [update or cancel your booking](${BOOKINGS_URL}).`;

type Embed = { title: string; color: number; description: string };

function reminderEmbed(booking: AtcBooking, position: string, title = 'Upcoming booking'): Embed {
	return {
		title,
		color: 0x0ea5e9,
		description: [
			`You're booked on **${position}** from <t:${unix(booking.start)}:t> to <t:${unix(booking.end)}:t> (<t:${unix(booking.start)}:R>).`,
			changePlans
		].join('\n\n')
	};
}

function coordinateEmbed(booking: AtcBooking, position: string, active: VnasController): Embed {
	const { realName, callsign } = active.vatsimData;
	return {
		title: 'Your booked position is active',
		color: 0xf59e0b,
		description: [
			`**${position}** is being worked right now by **${realName}** (${callsign}). Your booking starts <t:${unix(booking.start)}:t> (<t:${unix(booking.start)}:R>); please coordinate with them before you log on.`,
			changePlans
		].join('\n\n')
	};
}

// Every DM this run sends: who gets it, and what it says
function planReminders(
	allBookings: AtcBooking[],
	catalogue: CmsPosition[],
	controllers: VnasController[] | null,
	runTime: Date
) {
	// Bookings use the catalogue's callsigns, so an exact match finds them
	const positionOf = (booking: AtcBooking) =>
		catalogue.find((p) => p.callsign === booking.callsign && !p.retired);
	const nameOf = (booking: AtcBooking) => formatPosition(positionOf(booking), booking.callsign);
	const workingOf = (booking: AtcBooking) =>
		findPositionController(controllers ?? [], booking.callsign, positionOf(booking)?.id);
	const due = (leadMinutes: number) =>
		getDueReminders(allBookings, runTime, leadMinutes, CRON_INTERVAL_MINUTES);

	const planned = due(BOOKING_REMINDER_HOURS * 60).map((booking) => ({
		booking,
		embed: reminderEmbed(booking, nameOf(booking))
	}));

	// Only someone else on the position needs coordinating; the booked controller may log on early
	for (const booking of due(BOOKING_COORDINATE_MINUTES)) {
		const working = workingOf(booking);
		if (working && working.vatsimData.cid !== String(booking.cid)) {
			planned.push({ booking, embed: coordinateEmbed(booking, nameOf(booking), working) });
		}
	}

	// Without the vNAS feed nobody looks to be working, so the last reminder goes to everyone
	for (const booking of due(BOOKING_FINAL_REMINDER_MINUTES)) {
		if (!workingOf(booking)) {
			planned.push({
				booking,
				embed: reminderEmbed(booking, nameOf(booking), 'Your booking starts soon')
			});
		}
	}

	return planned;
}

// The vNAS feed is only needed for the coordinate check; reminders still go out without it
async function fetchControllersOrNull() {
	try {
		return await fetchControllers();
	} catch (error) {
		logger.error('Failed to read the vNAS controllers feed for booking reminders', { error });
		return null;
	}
}

// DMs controllers about their bookings through Indy Larry: a reminder a few hours before, a nudge
// to coordinate if their position is already being worked half an hour before, and a last reminder
// shortly before, unless the position is being worked
export async function runRemindBookings(
	larry: Cloudflare.Env['LARRY'],
	bookings: BookingsClient | undefined,
	positions: PositionsReader,
	runTime: Date
) {
	if (!larry || !bookings) return;

	// With no catalogue, reminders still go out, naming positions by callsign
	const [allBookings, catalogue, discordIds, controllers] = await Promise.all([
		bookings.listOrgBookings(),
		positions(),
		fetchRosterDiscordIds(),
		fetchControllersOrNull()
	]);

	const planned = planReminders(allBookings, catalogue, controllers, runTime);

	await Promise.all(
		planned.map(async ({ booking, embed }) => {
			const userId = discordIds.get(booking.cid);
			if (!userId) {
				logger.info(`No Discord ID for ${booking.cid}; skipping ${booking.callsign} reminder`);
				return;
			}

			try {
				await larry.enqueueDirect({ userId, embeds: [embed] });
				logger.info(`Queued ${booking.callsign} "${embed.title}" DM for ${booking.cid}`);
			} catch (error) {
				logger.error(`Failed to queue ${booking.callsign} reminder for ${booking.cid}`, { error });
			}
		})
	);
}
