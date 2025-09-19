import { eventsTable } from '$lib/db/schema/events';
import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { asc, and, eq, gt } from 'drizzle-orm';

export const load = async ({ locals }) => {
	const metars = await fetchMetars();

	const controllers = await fetchControllers();

	const events = await locals.db.query.eventsTable.findMany({
		orderBy: asc(eventsTable.startTime),
		where: and(
			gt(eventsTable.endTime, new Date()),
			eq(eventsTable.type, 'community'),
			eq(eventsTable.isPublished, true)
		),
		limit: 4
	});

	return {
		events,
		metars,
		controllers
	};
};
