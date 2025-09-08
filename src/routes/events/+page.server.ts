import { listEvents } from '$lib/server/events';
import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';

export const load = async ({ locals }) => {
	const events = await listEvents(locals.db);
	const vatsimEvents = await fetchEvents();

	return {
		events,
		vatsimEvents
	};
};
