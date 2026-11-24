import { inArray } from 'drizzle-orm';
import { eventsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import type { AtcBooking } from '$lib/types/bookings';
import { eventIdOf } from '$lib/utils/bookings';

// The names of the events these bookings were made for, by event ID. Only their names go to the
// page; an event we no longer have is left out.
export async function fetchEventNames(db: Database, bookings: AtcBooking[]) {
	const ids = [...new Set(bookings.flatMap((booking) => eventIdOf(booking.externalId) ?? []))];
	if (ids.length === 0) return {} as Record<string, string>;

	const events = await db
		.select({ id: eventsTable.id, name: eventsTable.name })
		.from(eventsTable)
		.where(inArray(eventsTable.id, ids));

	return Object.fromEntries(events.map((event) => [event.id, event.name]));
}
