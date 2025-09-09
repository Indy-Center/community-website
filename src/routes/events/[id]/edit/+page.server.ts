import { eventsTable } from '$lib/db/schema/events';
import { eq } from 'drizzle-orm';

export const load = async ({ locals, params }) => {
	const events = await locals.db.query.eventsTable.findMany({
		where: eq(eventsTable.id, params.id)
	});

	return {
		events
	};
};
