import { eventsTable } from '$lib/db/schema/events';
import { eq } from 'drizzle-orm';

export const load = async ({ locals, params }) => {
	const event = await locals.db.query.eventsTable.findFirst({
		where: eq(eventsTable.id, params.id)
	});

	return {
		event
	};
};
