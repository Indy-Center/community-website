import { BOOKING_REMINDER_HOURS, BOOKINGS_BETA_ONLY } from '$lib/config/bookings';
import { eventsTable } from '$lib/db/schema/events';
import { logger } from '$lib/server/logger';
import { fetchEventNames } from '$lib/server/bookings';
import type { AtcBooking, BookingsClient } from '$lib/types/bookings';
import { getUpcomingBookings, groupEventBookings } from '$lib/utils/bookings';
import type { Database } from '$lib/server/db';
import type { DiscordStep } from '$lib/profile/linkedAccounts';
import { socialSteps } from '$lib/server/socials';
import { isBetaTester } from '$lib/utils/permissions';
import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { asc, and, eq, gt, inArray } from 'drizzle-orm';

// Bookings starting soon. The home page doesn't depend on the booking system: if it isn't set up
// or fails, there are simply none to show. Positions name themselves from the layout's catalogue.
async function fetchUpcomingBookings(client: BookingsClient | undefined, db: Database) {
	if (!client) return [] as AtcBooking[];

	try {
		const upcoming = getUpcomingBookings(
			await client.listOrgBookings(),
			new Date(),
			BOOKING_REMINDER_HOURS
		);
		// An event with many positions is one row, not one per position
		return groupEventBookings(upcoming, await fetchEventNames(db, upcoming));
	} catch (error) {
		logger.error('Failed to read upcoming bookings for the home page', { error });
		return [] as AtcBooking[];
	}
}

export const load = async ({ locals, platform }) => {
	const [metars, controllers, bookings] = await Promise.all([
		fetchMetars(),
		fetchControllers(),
		// The bookings panel follows /bookings: admins and beta testers only while BOOKINGS_BETA_ONLY
		// is set
		fetchUpcomingBookings(
			BOOKINGS_BETA_ONLY && !isBetaTester(locals.roles) ? undefined : locals.bookings,
			locals.db
		)
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

	// The Discord button's state, streamed so asking larry doesn't hold up the page
	const discord: Promise<DiscordStep> = locals.user
		? socialSteps(platform?.env.LARRY, locals.user).then((steps) => steps.discord)
		: Promise.resolve('sign-in');

	return {
		events,
		metars,
		controllers,
		// Position and time only: names stay on /bookings, which asks people to sign in
		upcomingBookings: bookings.map(({ callsign, type, start, group }) => ({
			callsign,
			type,
			start,
			...(group
				? { group: { eventId: group.eventId, name: group.name, count: group.members.length } }
				: {})
		})),
		discord
	};
};
