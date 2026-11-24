import { BOOKING_REMINDER_HOURS, BOOKINGS_URL } from '$lib/config/bookings';
import { logger } from '$lib/server/logger';
import { fetchRosterDiscordIds } from '$lib/server/vatsim/vatusaDataClient';
import type { PositionsReader } from '$lib/server/positions';
import type { AtcBooking, BookingsClient } from '$lib/types/bookings';
import { getDueReminders, parseBookingTime, positionText } from '$lib/utils/bookings';

// Matches the "0-59/5 * * * *" cron in wrangler.jsonc
const CRON_INTERVAL_MINUTES = 5;

const unix = (time: string) => Math.floor(parseBookingTime(time).getTime() / 1000);

function reminderEmbed(booking: AtcBooking, position: string) {
	return {
		title: 'Upcoming booking',
		color: 0x0ea5e9,
		description: [
			`You're booked on **${position}** from <t:${unix(booking.start)}:t> to <t:${unix(booking.end)}:t> (<t:${unix(booking.start)}:R>).`,
			`If your plans have changed, please [update or cancel your booking](${BOOKINGS_URL}).`
		].join('\n\n')
	};
}

// DMs each controller through Indy Larry a few hours before their booking starts
export async function runRemindBookings(
	larry: Cloudflare.Env['LARRY'],
	bookings: BookingsClient | undefined,
	positions: PositionsReader,
	runTime: Date
) {
	if (!larry || !bookings) return;

	// With no catalogue, reminders still go out, naming positions by callsign
	const [allBookings, catalogue, discordIds] = await Promise.all([
		bookings.listOrgBookings(),
		positions(),
		fetchRosterDiscordIds()
	]);

	const due = getDueReminders(allBookings, runTime, BOOKING_REMINDER_HOURS, CRON_INTERVAL_MINUTES);
	if (due.length === 0) return;

	await Promise.all(
		due.map(async (booking) => {
			const userId = discordIds.get(booking.cid);
			if (!userId) {
				logger.info(`No Discord ID for ${booking.cid}; skipping ${booking.callsign} reminder`);
				return;
			}

			try {
				await larry.enqueueDirect({
					userId,
					embeds: [reminderEmbed(booking, positionText(booking.callsign, catalogue))]
				});
				logger.info(`Queued ${booking.callsign} reminder for ${booking.cid}`);
			} catch (error) {
				logger.error(`Failed to queue ${booking.callsign} reminder for ${booking.cid}`, { error });
			}
		})
	);
}
