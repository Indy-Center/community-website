import { eventsTable } from '$lib/db/schema/events';
import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { asc, and, eq, gt } from 'drizzle-orm';

const ARTCC_ID = 'ZID';
const AIRPORTS = ['KSDF', 'KCVG', 'KIND', 'KCMH', 'KDAY'];

export const load = async ({ locals }) => {
	const metars = await fetchMetars(AIRPORTS);

	const controllers = await fetchControllers(ARTCC_ID);

	const events = await locals.db.query.eventsTable.findMany({
		orderBy: asc(eventsTable.startTime),
		where: and(gt(eventsTable.endTime, new Date()), eq(eventsTable.type, 'community')),
		limit: 4
	});

	return {
		events,
		metars,
		controllers
	};
};
