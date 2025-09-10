import { eventsTable } from '$lib/db/schema/events';
import { eventSchema } from '$lib/forms/events';
import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load = async ({ locals, params }) => {
	if (!locals.roles?.includes('events:manage')) {
		return redirect(302, '/');
	}

	const event = await locals.db.query.eventsTable.findFirst({
		where: eq(eventsTable.id, params.id),
		with: {
			positions: true
		}
	});

	if (!event) {
		return redirect(302, '/events');
	}

	const vatsimEvents = await fetchEvents();

	const form = await superValidate(
		{
			name: event.name,
			description: event.description,
			bannerUrl: event.bannerUrl,
			type: event.type as 'community' | 'support',
			rosterType: event.rosterType as 'open' | 'assigned' | 'none',
			startTime: event.startTime.toISOString().slice(0, 16),
			endTime: event.endTime.toISOString().slice(0, 16)
		},
		zod4(eventSchema)
	);

	return {
		vatsimEvents,
		form
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		if (!locals.roles?.includes('events:manage')) {
			return redirect(302, '/');
		}
		const form = await superValidate(request, zod4(eventSchema));

		if (!form.valid) {
			const vatsimEvents = await fetchEvents();
			return fail(400, { form, vatsimEvents });
		}

		console.log(`Saving new event "${form.data.name}"`);
		const [savedEvent] = await locals.db
			.update(eventsTable)
			.set({
				name: form.data.name,
				description: form.data.description,
				bannerUrl: form.data.bannerUrl,
				type: form.data.type,
				rosterType: form.data.rosterType,
				startTime: form.data.startTime,
				endTime: form.data.endTime,
				isPublished: true
			})
			.where(eq(eventsTable.id, params.id))
			.returning()
			.values({
				name: form.data.name,
				description: form.data.description,
				bannerUrl: form.data.bannerUrl,
				type: form.data.type,
				rosterType: form.data.rosterType,
				startTime: form.data.startTime,
				endTime: form.data.endTime,
				isPublished: true
			});
		return redirect(302, `/events/${params.id}`);
	}
};
