import { eventsTable, eventPositionsTable } from '$lib/db/schema/events';
import { eq, and } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { canManageEvents } from '$lib/utils/permissions.js';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient.js';

export const load = async ({ locals, params, depends }) => {
	if (!canManageEvents(locals.roles)) {
		return redirect(302, '/');
	}

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


	const users = await locals.db.query.usersTable.findMany({
		orderBy: (users, { asc }) => [asc(users.preferredName), asc(users.firstName)]
	});

	const artccInformation = await fetchArtccInformation('ZID');

	return {
		event,
		users,
		artccInformation
	};
};

export const actions = {
	updateAssignment: async ({ locals, request, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const formData = await request.formData();
		const positionId = formData.get('positionId');
		const userId = formData.get('userId') || null;

		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: userId === 'null' || userId === '' ? null : userId,
				updatedAt: new Date()
			})
			.where(eq(eventPositionsTable.position, positionId));

		return { success: true };
	},

	addPosition: async ({ locals, request, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const formData = await request.formData();
		const positions = formData.getAll('position') as string[];

		if (!positions.length) {
			return { error: 'No positions selected' };
		}

		// Check for existing positions
		const existingPositions = await Promise.all(
			positions.map((position) =>
				locals.db.query.eventPositionsTable.findFirst({
					where: (eventPositions, { and, eq }) =>
						and(eq(eventPositions.eventId, params.id), eq(eventPositions.position, position))
				})
			)
		);

		const duplicates = positions.filter((_, index) => existingPositions[index]);
		if (duplicates.length > 0) {
			return { error: `Positions already exist: ${duplicates.join(', ')}` };
		}

		// Insert all positions
		await locals.db.insert(eventPositionsTable).values(
			positions.map((position) => ({
				eventId: params.id,
				position,
				userId: null
			}))
		);

		return { success: true };
	},

	removePosition: async ({ locals, request, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const formData = await request.formData();
		const position = formData.get('position') as string;

		if (!position) {
			return { error: 'Position is required' };
		}


		await locals.db
			.delete(eventPositionsTable)
			.where(
				and(eq(eventPositionsTable.eventId, params.id), eq(eventPositionsTable.position, position))
			);

		return { success: true };
	},

	toggleRosterPublished: async ({ locals, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const event = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

		if (!event) {
			return { error: 'Event not found' };
		}

		await locals.db
			.update(eventsTable)
			.set({
				isRosterPublished: !event.isRosterPublished,
				updatedAt: new Date()
			})
			.where(eq(eventsTable.id, params.id));

		return { success: true };
	}
};
