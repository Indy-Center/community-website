import type { VatusaRosterResponse } from '$lib/types/vatusa';

const VATUSA_API_BASE_URL = 'https://api.vatusa.net';

export async function fetchRoster(artcc: string, membership: 'home' | 'visit' | 'both' = 'both') {
	const url = `${VATUSA_API_BASE_URL}/facility/${artcc}/roster/${membership}`;
	const response = await fetch(url).then((res) => res.json());
	const { data } = response as VatusaRosterResponse;

	return data;
}
