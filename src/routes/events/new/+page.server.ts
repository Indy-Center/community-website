import { eventSchema } from '$lib/forms/events';
import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, superValidate } from 'sveltekit-superforms';
import { eventsTable } from '$lib/db/schema/events';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
	if (!locals.roles?.includes('events:manage')) {
		return redirect(302, '/');
	}

	const vatsimEvents = await fetchEvents();

	const form = await superValidate(zod4(eventSchema));

	return {
		vatsimEvents,
		form
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.roles?.includes('events:manage')) {
			return redirect(302, '/');
		}
		const form = await superValidate(request, zod4(eventSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		console.log(`Saving new event "${form.data.name}"`);
		const [savedEvent] = await locals.db
			.insert(eventsTable)
			.values({
				id: crypto.randomUUID(),
				name: form.data.name,
				description: form.data.description,
				bannerUrl: form.data.bannerUrl,
				type: form.data.type,
				rosterType: form.data.rosterType,
				startTime: form.data.startTime,
				endTime: form.data.endTime,
				isPublished: true
			})
			.returning();

		return redirect(302, `/events/${savedEvent.id}`);
	}
};
