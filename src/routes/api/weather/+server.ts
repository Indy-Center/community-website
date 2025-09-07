import { fetchMetars } from '$lib/server/vatsim/vatsimDataClient';
import { json } from '@sveltejs/kit';

const AIRPORTS = ['KSDF', 'KCVG', 'KIND', 'KCMH', 'KDAY'];

export const GET = async () => {
	const metars = await fetchMetars(AIRPORTS);

	return json({ metars, airports: AIRPORTS });
};
