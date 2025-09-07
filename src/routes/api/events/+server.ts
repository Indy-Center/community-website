import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';
import { json } from '@sveltejs/kit';

export const GET = async ({ url }) => {
	const limit = url.searchParams.get('limit');

	const vatsimEvents = await fetchEvents().then((events) =>
		events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
	);

	return json({
		vatsimEvents: vatsimEvents.slice(0, limit ? parseInt(limit) : vatsimEvents.length)
	});
};
