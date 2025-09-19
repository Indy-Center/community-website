const VATSIM_METAR_BASE_URL = 'https://metar.vatsim.net';
const VATSIM_LIST_EVENTS_BASE_URL = 'https://my.vatsim.net/api/v2/events/view/division/USA';
const VATSIM_EVENT_BASE_URL = 'https://my.vatsim.net/api/v2/events/view';

import type { VatsimEvent, VatsimEventResponse, VatsimMetarResponse } from '$lib/types/vatsim';
import { METAR_AIRPORTS } from '$lib/config';

export async function fetchMetars(
	airports: string[] = METAR_AIRPORTS
): Promise<VatsimMetarResponse> {
	const airportsString = airports.join(',').toUpperCase();

	const url = `${VATSIM_METAR_BASE_URL}/${airportsString}?format=json`;

	const response = await fetch(url);
	const data = (await response.json()) as VatsimMetarResponse;

	return data;
}

export async function fetchEvents(): Promise<VatsimEvent[]> {
	const response = await fetch(VATSIM_LIST_EVENTS_BASE_URL);
	const data = (await response.json()) as VatsimEventResponse;

	return data.data;
}

export async function fetchEvent(id: number): Promise<VatsimEvent> {
	const response = await fetch(`${VATSIM_EVENT_BASE_URL}/${id}`);
	const data = (await response.json()) as { data: VatsimEvent };

	return data.data;
}
