import type { VnasControllerResponse } from '$lib/types/vnas';
import { USE_MOCK_DATA, MOCK_CONTROLLERS } from '$lib/mocks';

const VNAS_DATA_FEED_BASE_URL = 'https://live.env.vnas.vatsim.net/data-feed';

export async function fetchControllers(artcc: string) {
	if (USE_MOCK_DATA) {
		// Filter mock controllers by ARTCC if needed, or return all
		return MOCK_CONTROLLERS.filter(controller => controller.artccId === artcc);
	}

	const url = `${VNAS_DATA_FEED_BASE_URL}/controllers.json`;
	const response = await fetch(url).then((res) => res.json());
	const { controllers } = response as VnasControllerResponse;

	const filteredControllers = controllers.filter((controller) => controller.artccId === artcc);

	return filteredControllers;
}
