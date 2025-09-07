import type { VatsimEvent } from '$lib/types';
import type { PageLoad } from './$types';

export const load = (async ({ fetch }) => {
	const response = (await fetch('/api/events?limit=5').then((res) => res.json())) as {
		vatsimEvents: VatsimEvent[];
	};

	const events = response.vatsimEvents.map((event) => ({
		name: event.name,
		description: event.short_description,
		image: event.banner,
		starts_at: event.start_time,
		ends_at: event.end_time,
		airports: event.airports.map((airport) => airport.icao),
		organizer: event.organisers[0]?.subdivision || event.organisers[0]?.division || 'VATSIM',
		link: event.link
	}));

	return {
		events
	};
}) satisfies PageLoad;