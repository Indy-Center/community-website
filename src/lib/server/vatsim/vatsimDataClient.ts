const VATSIM_METAR_BASE_URL = 'https://metar.vatsim.net';
const VATSIM_EVENTS_BASE_URL = 'https://my.vatsim.net/api/v2/events/view/division/USA';

import type { VatsimEvent, VatsimEventResponse, VatsimMetarResponse } from '$lib/types/vatsim';
import { USE_MOCK_DATA, MOCK_EVENTS } from '$lib/mocks';

export async function fetchMetars(airports: string[]): Promise<VatsimMetarResponse> {
	if (USE_MOCK_DATA) {
		// Return mock METAR data
		return airports.map((airport) => ({
			id: airport,
			metar: `${airport} 301953Z 00000KT 10SM CLR 25/12 A3000`
		}));
	}

	const airportsString = airports.join(',').toUpperCase();

	const url = `${VATSIM_METAR_BASE_URL}/${airportsString}?format=json`;

	const response = await fetch(url);
	const data = (await response.json()) as VatsimMetarResponse;

	return data;
}

export async function fetchEvents(): Promise<VatsimEvent[]> {
	if (USE_MOCK_DATA) {
		return MOCK_EVENTS;
	}

	const response = await fetch(VATSIM_EVENTS_BASE_URL);
	const data = (await response.json()) as VatsimEventResponse;

	return data.data;
}
