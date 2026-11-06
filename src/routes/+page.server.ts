import { BOOKING_REMINDER_HOURS } from '$lib/config/bookings';
import { eventsTable } from '$lib/db/schema/events';
import { logger } from '$lib/server/logger';
import { fetchBookings, fetchEventNames } from '$lib/server/bookings';
import type { AtcBooking, BookingsWorker } from '$lib/types/bookings';
import { getPositionLabels, getUpcomingBookings, groupEventBookings } from '$lib/utils/bookings';
import type { Database } from '$lib/server/db';
import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { asc, and, eq, gt, inArray } from 'drizzle-orm';

// Bookings starting soon, with the position names to show. The home page doesn't depend on the
// booking system: if the Worker is missing or fails, there are simply none to show.
async function fetchUpcomingBookings(worker: BookingsWorker | undefined, db: Database) {
	if (!worker) return { upcomingBookings: [] as AtcBooking[], bookingPositions: {} };

	try {
		const [bookings, positions] = await Promise.all([fetchBookings(worker), worker.getPositions()]);
		const upcoming = getUpcomingBookings(bookings, new Date(), BOOKING_REMINDER_HOURS);
		// An event with many positions is one row, not one per position
		const upcomingBookings = groupEventBookings(upcoming, await fetchEventNames(db, upcoming));
		const labels = getPositionLabels(positions);

		return {
			upcomingBookings,
			bookingPositions: Object.fromEntries(
				upcomingBookings
					.filter((booking) => labels[booking.callsign])
					.map((booking) => [booking.callsign, labels[booking.callsign]])
			)
		};
	} catch (error) {
		logger.error('Failed to read upcoming bookings for the home page', { error });
		return { upcomingBookings: [] as AtcBooking[], bookingPositions: {} };
	}
}

export const load = async ({ locals, platform }) => {
	const [metars, controllers, bookings] = await Promise.all([
		fetchMetars(),
		fetchControllers(),
		fetchUpcomingBookings(platform?.env.BOOKINGS, locals.db)
	]);

	const events = await locals.db.query.eventsTable.findMany({
		orderBy: asc(eventsTable.startTime),
		where: and(
			gt(eventsTable.endTime, new Date()),
			inArray(eventsTable.type, ['community', 'home', 'group_flight']),
			eq(eventsTable.isPublished, true)
		),
		limit: 4
	});

	return {
		events,
		metars,
		controllers,
		// Position and time only: names stay on /bookings, which asks people to sign in
		upcomingBookings: bookings.upcomingBookings.map(({ callsign, type, start, group }) => ({
			callsign,
			type,
			start,
			...(group
				? { group: { eventId: group.eventId, name: group.name, count: group.members.length } }
				: {})
		})),
		bookingPositions: bookings.bookingPositions
	};
};
