import { createEvent } from '$lib/server/events';
import { fetchEvent } from '$lib/server/vatsim/vatsimDataClient.js';
import { hasAnyRole } from '$lib/user';
import { redirect } from '@sveltejs/kit';
import { parseISO, format, formatISO } from 'date-fns';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v4';
import { UTCDate } from '@date-fns/utc';

const eventSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['support', 'community', 'vatsim', 'indy_center', 'staffing_request']),
	rosterType: z.string().default('none'),
	bannerUrl: z.string(),
	description: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	isPublished: z.boolean().default(true),
	createdAt: z.date(),
	updatedAt: z.date()
});

const eventCrudSchema = eventSchema.extend({
	id: eventSchema.shape.id.optional(),
	createdAt: eventSchema.shape.createdAt.optional(),
	updatedAt: eventSchema.shape.updatedAt.optional(),
	isPublished: eventSchema.shape.isPublished.optional()
});

export const load = async ({ locals, url }) => {
	if (!locals.user || !hasAnyRole(locals.user, ['events:manage'])) {
		redirect(302, '/');
	}

	// Copying from Existing VATSIM Event
	if (url.searchParams.get('import')) {
		const vatsimData = await fetchEvent(Number(url.searchParams.get('import')));
		console.log(vatsimData);
		return {
			form: await superValidate(
				{
					name: vatsimData.name,
					description: vatsimData.short_description,
					type: 'vatsim',
					rosterType: 'none',
					bannerUrl: vatsimData.banner,
					// Convert VATSIM UTC datetime to datetime-local format (YYYY-MM-DDTHH:mm)
					startTime: format(new UTCDate(vatsimData.start_time), "yyyy-MM-dd'T'HH:mm"),
					endTime: format(new UTCDate(vatsimData.end_time), "yyyy-MM-dd'T'HH:mm"),
					isPublished: true
				},
				zod4(eventCrudSchema)
			)
		};
	}

	const form = await superValidate(zod4(eventCrudSchema));

	return {
		form
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const { db } = locals;
		const form = await superValidate(request, zod4(eventCrudSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const event = await createEvent(db, form.data);
		return message(form, 'Event created successfully');
	}
};
