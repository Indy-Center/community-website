import type { VnasArtccResponse, VnasControllerResponse } from '$lib/types/vnas';
import { FACILITY_ID } from '$lib/config';

const VNAS_DATA_FEED_BASE_URL = 'https://live.env.vnas.vatsim.net/data-feed';
const VNAS_ARTCC_BASE_URL = 'https://data-api.vnas.vatsim.net/api/artccs';

export async function fetchControllers(artcc: string = FACILITY_ID) {
	const url = `${VNAS_DATA_FEED_BASE_URL}/controllers.json`;
	const response = await fetch(url).then((res) => res.json());
	const { controllers } = response as VnasControllerResponse;

	const filteredControllers = controllers.filter((controller) => controller.artccId === artcc);

	return filteredControllers;
}

export async function fetchArtccInformation(facilityId: string = FACILITY_ID) {
	const url = `${VNAS_ARTCC_BASE_URL}/${facilityId}`;
	const response = await fetch(url).then((res) => res.json<VnasArtccResponse>());

	return response;
}
