import { BOOKING_REMINDER_HOURS, BOOKINGS_URL } from '$lib/config/bookings';
import { logger } from '$lib/server/logger';
import { fetchBookings } from '$lib/server/bookings';
import { fetchRosterDiscordIds } from '$lib/server/vatsim/vatusaDataClient';
import type { AtcBooking, BookingsWorker } from '$lib/types/bookings';
import {
	describePosition,
	getDueReminders,
	getPositionLabels,
	parseBookingTime,
	type PositionLabel
} from '$lib/utils/bookings';

// Matches the "0-59/5 * * * *" cron in wrangler.jsonc
const CRON_INTERVAL_MINUTES = 5;

const unix = (time: string) => Math.floor(parseBookingTime(time).getTime() / 1000);

function reminderEmbed(booking: AtcBooking, label: PositionLabel | undefined) {
	return {
		title: 'Upcoming booking',
		color: 0x0ea5e9,
		description: [
			`You're booked on **${describePosition(booking.callsign, label)}** from <t:${unix(booking.start)}:t> to <t:${unix(booking.end)}:t> (<t:${unix(booking.start)}:R>).`,
			`If your plans have changed, please [update or cancel your booking](${BOOKINGS_URL}).`
		].join('\n\n')
	};
}

// DMs each controller through Indy Larry a few hours before their booking starts
export async function runRemindBookings(
	larry: Cloudflare.Env['LARRY'],
	bookings: BookingsWorker | undefined,
	runTime: Date
) {
	if (!larry || !bookings) return;

	const [allBookings, positions, discordIds] = await Promise.all([
		fetchBookings(bookings),
		bookings.getPositions().catch((error) => {
			// Reminders still go out, naming positions by callsign
			logger.error('Failed to read the bookable positions for reminders', { error });
			return [];
		}),
		fetchRosterDiscordIds()
	]);

	const due = getDueReminders(allBookings, runTime, BOOKING_REMINDER_HOURS, CRON_INTERVAL_MINUTES);
	if (due.length === 0) return;

	const labels = getPositionLabels(positions);

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
					embeds: [reminderEmbed(booking, labels[booking.callsign])]
				});
				logger.info(`Queued ${booking.callsign} reminder for ${booking.cid}`);
			} catch (error) {
				logger.error(`Failed to queue ${booking.callsign} reminder for ${booking.cid}`, { error });
			}
		})
	);
}
