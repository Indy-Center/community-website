import { eventsTable } from '$lib/db/schema/events';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
	const event = await locals.db.query.eventsTable.findFirst({
		where: eq(eventsTable.id, params.id)
	});

	return {
		event
	};
};

export const actions = {
	delete: async ({ locals, params }) => {
		if (!locals.roles?.includes('events:manage')) {
			return redirect(302, '/');
		}

		await locals.db.delete(eventsTable).where(eq(eventsTable.id, params.id));

		return redirect(302, '/events');
	}
};
