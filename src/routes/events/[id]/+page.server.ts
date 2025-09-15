import {
	eventsTable,
	eventPositionsTable,
	eventPositionRequestsTable
} from '$lib/db/schema/events';
import { eq, not } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { canManage, canManageEvents, Role } from '$lib/utils/permissions';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient.js';
import { isBefore, subHours } from 'date-fns';
import { isSignUpClosed } from '$lib/utils/events';

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
			artccInformation = await fetchArtccInformation('ZID');
		} catch (error) {
			console.error('Failed to fetch ARTCC information:', error);
		}
	}

	return {
		event,
		artccInformation,
		userRoles: locals.roles,
		userId: locals.session?.userId
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

		const formData = await request.formData();
		const position = formData.get('position') as string;

		if (!position) {
			return { error: 'Position is required' };
		}

		// Check if event exists and roster is published
		const event = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

		if (isSignUpClosed(event)) {
			return { error: 'Event roster is not available for sign-up' };
		}

		// Update the position assignment
		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: locals.session.userId,
				updatedAt: new Date()
			})
			.where(eq(eventPositionsTable.position, position));

		return { success: true };
	},

	unassignFromPosition: async ({ locals, request, params }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const position = formData.get('position') as string;

		if (!position) {
			return { error: 'Position is required' };
		}

		// Update the position to unassign
		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: null,
				updatedAt: new Date()
			})
			.where(eq(eventPositionsTable.position, position));

		return { success: true };
	},

	requestPosition: async ({ locals, request, params }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const comments = formData.get('comments') as string;

		// Check if event exists and is assigned roster type
		const event = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

		if (!event || event.rosterType !== 'assigned') {
			return { error: 'Position requests are not available for this event' };
		}

		// Check if user already has a request for this event
		const existingRequest = await locals.db.query.eventPositionRequestsTable.findFirst({
			where: (requests, { and, eq }) =>
				and(eq(requests.eventId, params.id), eq(requests.userId, locals.session!.userId))
		});

		if (existingRequest) {
			return { error: 'You already have a position request for this event' };
		}

		// Create position request
		await locals.db.insert(eventPositionRequestsTable).values({
			id: crypto.randomUUID(),
			eventId: params.id,
			userId: locals.session.userId,
			comments
		});

		return { success: true };
	}
};
