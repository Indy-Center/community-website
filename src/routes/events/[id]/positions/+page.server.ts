import { eventsTable, eventPositionsTable } from '$lib/db/schema/events';
import { eq, and } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import { canManageEvents } from '$lib/utils/permissions.js';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient.js';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

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

	const artccInformation = await fetchArtccInformation();

	return {
		event,
		users,
		artccInformation
	};
};

const updateAssignmentSchema = z.object({
	positionId: z.string().min(1),
	userId: z.string().optional().nullable()
});

const addPositionSchema = z.object({
	position: z.array(z.string().min(1)).min(1)
});

const removePositionSchema = z.object({
	position: z.string().min(1)
});

export const actions = {
	updateAssignment: async ({ locals, request, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const form = await superValidate(request, zod4(updateAssignmentSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: form.data.userId || null,
				updatedAt: new Date()
			})
			.where(and(eq(eventPositionsTable.position, form.data.positionId), eq(eventPositionsTable.eventId, params.id)));

		return { success: true };
	},

	addPosition: async ({ locals, request, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const form = await superValidate(request, zod4(addPositionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const positions = form.data.position;

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
			return fail(400, { error: `Positions already exist: ${duplicates.join(', ')}`, form });
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

		const form = await superValidate(request, zod4(removePositionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await locals.db
			.delete(eventPositionsTable)
			.where(
				and(eq(eventPositionsTable.eventId, params.id), eq(eventPositionsTable.position, form.data.position))
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
