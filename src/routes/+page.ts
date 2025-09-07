import type { VatsimEvent, VatsimMetarResponse } from '$lib/types/vatsim';
import type { VnasController } from '$lib/types/vnas';

export async function load({ fetch }) {
	const response = (await fetch('/api/events?limit=4').then((res) => res.json())) as {
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

	const weatherResponse = (await fetch('/api/weather').then((res) => res.json())) as {
		metars: VatsimMetarResponse;
	};

	const controllersResponse = (await fetch('/api/controllers').then((res) => res.json())) as {
		controllers: VnasController[];
	};

	return {
		events,
		metars: weatherResponse.metars,
		controllers: controllersResponse.controllers
	};
}
