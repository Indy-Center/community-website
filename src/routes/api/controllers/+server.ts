import { fetchControllers } from '$lib/server/vatsim/vnasDataClient';
import { json } from '@sveltejs/kit';

const ARTCC_ID = 'ZID';

export const GET = async () => {
	const controllers = await fetchControllers(ARTCC_ID);

	return json({ controllers });
};
