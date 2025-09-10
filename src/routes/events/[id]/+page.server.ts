import { eventsTable } from '$lib/db/schema/events';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { canManage, canManageEvents, Role } from '$lib/utils/permissions';

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
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		await locals.db.delete(eventsTable).where(eq(eventsTable.id, params.id));

		return redirect(302, '/events');
	},
	publish: async ({ locals, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		await locals.db
			.update(eventsTable)
			.set({ isPublished: true })
			.where(eq(eventsTable.id, params.id));

		return redirect(302, `/events/${params.id}`);
	},
	unpublish: async ({ locals, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		await locals.db
			.update(eventsTable)
			.set({ isPublished: false })
			.where(eq(eventsTable.id, params.id));

		return redirect(302, `/events/${params.id}`);
	}
};
