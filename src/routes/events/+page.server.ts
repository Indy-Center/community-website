import { eventsTable } from '$lib/db/schema/events';
import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';
import { asc, gt } from 'drizzle-orm';

export const load = async ({ locals }) => {
	const events = await locals.db.query.eventsTable.findMany({
		orderBy: asc(eventsTable.startTime),
		where: gt(eventsTable.endTime, new Date())
	});

	const vatsimEvents = await fetchEvents();

	return {
		events,
		vatsimEvents
	};
};
