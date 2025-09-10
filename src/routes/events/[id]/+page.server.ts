import { eventsTable } from '$lib/db/schema/events';
import { eq, not } from 'drizzle-orm';
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
	togglePublish: async ({ locals, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		await locals.db
			.update(eventsTable)
			.set({ isPublished: not(eventsTable.isPublished) })
			.where(eq(eventsTable.id, params.id));

		return redirect(302, `/events/${params.id}`);
	}
};
