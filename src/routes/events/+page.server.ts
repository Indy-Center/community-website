import { eventsTable } from '$lib/db/schema/events';
import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';
import { canManageEvents } from '$lib/utils/permissions.js';
import { asc, gt } from 'drizzle-orm';

export const load = async ({ locals }) => {
	const events = await locals.db.query.eventsTable.findMany({
		orderBy: asc(eventsTable.startTime),
		where: gt(eventsTable.endTime, new Date())
	});

	const filteredEvents = events.filter(
		(event) => event.isPublished || canManageEvents(locals.roles)
	);

	const vatsimEvents = await fetchEvents();

	return {
		events: filteredEvents,
		vatsimEvents
	};
};
