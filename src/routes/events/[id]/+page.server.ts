import {
	eventsTable,
	eventPositionsTable,
	eventPositionRequestsTable
} from '$lib/db/schema/events';
import { and, eq, not } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import { canManage, canManageEvents, Role } from '$lib/utils/permissions';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient.js';
import { isBefore, subHours } from 'date-fns';
import { isSignUpClosed } from '$lib/utils/events';
import { logger } from '$lib/server/logger';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

export const load = async ({ locals, params }) => {
	const event = await locals.db.query.eventsTable.findFirst({
		where: eq(eventsTable.id, params.id),
		with: {
			positions: {
				with: {
					user: true
				}
			},
			positionRequests: {
				with: {
					user: true
				}
			}
		}
	});

	if (!event) {
		return redirect(302, '/events');
	}

	// Get ARTCC information for position display enhancement
	let artccInformation = null;
	if (event.rosterType !== 'none' && event.isRosterPublished) {
		try {
			artccInformation = await fetchArtccInformation();
		} catch (error) {
			logger.error('Failed to fetch ARTCC information:', error);
		}
	}

	return {
		event,
		artccInformation,
		userRoles: locals.roles,
		userId: locals.session?.userId
	};
};

const signUpForPositionSchema = z.object({
	position: z.string().min(1)
});

const unassignFromPositionSchema = z.object({
	position: z.string().min(1)
});

const requestPositionSchema = z.object({
	comments: z.string().optional()
});

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

		const event = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

		// Publishing the event sets its roster to released if it's an open roster
		// We could probably do this in the update above but it was hurting my brain
		if (event && event.rosterType === 'open' && event.isPublished) {
			await locals.db
				.update(eventsTable)
				.set({ isRosterPublished: true })
				.where(eq(eventsTable.id, params.id));
		}

		return redirect(302, `/events/${params.id}`);
	},

	signUpForPosition: async ({ locals, request, params }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const form = await superValidate(request, zod4(signUpForPositionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if event exists and roster is published
		const event = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

		if (isSignUpClosed(event)) {
			return fail(400, { error: 'Event roster is not available for sign-up', form });
		}

		// Update the position assignment
		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: locals.session.userId,
				updatedAt: new Date()
			})
			.where(
				and(eq(eventPositionsTable.position, form.data.position), eq(eventPositionsTable.eventId, params.id))
			);

		return { success: true };
	},

	unassignFromPosition: async ({ locals, request, params }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const form = await superValidate(request, zod4(unassignFromPositionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Update the position to unassign
		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: null,
				updatedAt: new Date()
			})
			.where(
				and(eq(eventPositionsTable.position, form.data.position), eq(eventPositionsTable.eventId, params.id))
			);

		return { success: true };
	},

	requestPosition: async ({ locals, request, params }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const form = await superValidate(request, zod4(requestPositionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if event exists and is assigned roster type
		const event = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

		if (!event || event.rosterType !== 'assigned') {
			return fail(400, { error: 'Position requests are not available for this event', form });
		}

		// Check if user already has a request for this event
		const existingRequest = await locals.db.query.eventPositionRequestsTable.findFirst({
			where: (requests, { and, eq }) =>
				and(eq(requests.eventId, params.id), eq(requests.userId, locals.session!.userId))
		});

		if (existingRequest) {
			return fail(400, { error: 'You already have a position request for this event', form });
		}

		// Create position request
		await locals.db.insert(eventPositionRequestsTable).values({
			id: crypto.randomUUID(),
			eventId: params.id,
			userId: locals.session.userId,
			comments: form.data.comments
		});

		return { success: true };
	}
};
