import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';

export const load = async ({ locals }) => {
	const events = await locals.db.query.eventsTable.findMany({
		with: {
			positions: true
		}
	});

	const vatsimEvents = await fetchEvents();

	return {
		events,
		vatsimEvents
	};
};
