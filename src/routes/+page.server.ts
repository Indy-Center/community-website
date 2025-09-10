import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';

const ARTCC_ID = 'ZID';
const AIRPORTS = ['KSDF', 'KCVG', 'KIND', 'KCMH', 'KDAY'];

export const load = async ({ locals }) => {
	const metars = await fetchMetars(AIRPORTS);

	const controllers = await fetchControllers(ARTCC_ID);

	const events = await locals.db.query.eventsTable.findMany();

	return {
		events,
		metars,
		controllers
	};
};
