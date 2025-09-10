import { eventsTable } from '$lib/db/schema/events';
import { eventSchema } from '$lib/forms/events';
import { fetchEvents } from '$lib/server/vatsim/vatsimDataClient';
import { canManageEvents } from '$lib/utils/permissions';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load = async ({ locals, params, url }) => {
	if (!canManageEvents(locals.roles)) {
		return redirect(302, '/');
	}

	const vatsimEvents = await fetchEvents();

	// Check for importId to pre-fill form from VATSIM event
	const importId = url.searchParams.get('importId');
	let prefilledData: any = {};

	if (importId) {
		const vatsimEvent = vatsimEvents.find((event) => event.id === Number(importId));
		if (vatsimEvent) {
			prefilledData = {
				name: vatsimEvent.name,
				type: 'support',
				description: vatsimEvent.description,
				bannerUrl: vatsimEvent.banner || '',
				startTime: new Date(vatsimEvent.start_time).toISOString().slice(0, 16),
				endTime: new Date(vatsimEvent.end_time).toISOString().slice(0, 16)
			};
		}
	}

	const form =
		Object.keys(prefilledData).length > 0
			? await superValidate(prefilledData, zod4(eventSchema))
			: await superValidate(zod4(eventSchema));

	return {
		vatsimEvents,
		form
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}
		const form = await superValidate(request, zod4(eventSchema));

		if (!form.valid) {
			const vatsimEvents = await fetchEvents();
			return fail(400, { form, vatsimEvents });
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
