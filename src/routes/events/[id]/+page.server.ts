import {
	eventBriefingsTable,
	eventsTable,
	eventPositionsTable,
	eventPositionRequestsTable
} from '$lib/db/schema/events';
import { and, eq, not } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import { canManage, canManageEvents, isEventSignupProhibited, Role } from '$lib/utils/permissions';
import { fetchArtccInformation } from '$lib/server/vatsim/vnasDataClient.js';
import { isBefore, subHours } from 'date-fns';
import { isSignUpClosed } from '$lib/utils/events';
import { logger } from '$lib/server/logger';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { DISCORD_LIMIT } from '$lib/utils/briefing';
import { shownMember, shownMemberQuery } from '$lib/members';
import {
	cancelEvent,
	clearBookingProblems,
	readBookingProblems,
	syncAssignment,
	syncEvent
} from '$lib/server/eventBookings';
import {
	briefingDraft,
	refreshBriefing,
	removeEventRole,
	sendBriefing
} from '$lib/server/eventBriefing';

export const load = async ({ locals, params, url }) => {
	const manager = canManageEvents(locals.roles);
	const [found, sentBriefing, catalogue, bookingProblems] = await Promise.all([
		locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id),
			with: {
				positions: {
					with: { user: shownMemberQuery }
				},
				positionRequests: {
					columns: { userId: true, comments: true, createdAt: true },
					with: { user: shownMemberQuery }
				}
			}
		}),
		// Only event managers send briefings
		manager
			? locals.db.query.eventBriefingsTable.findFirst({
					where: eq(eventBriefingsTable.eventId, params.id)
				})
			: undefined,
		manager ? locals.positions() : [],
		// What the booking system refused, for managers to pass on to the tech team
		manager ? readBookingProblems(locals.db, params.id) : []
	]);

	if (!found) {
		return redirect(302, '/events');
	}

	// Page data goes to every visitor's browser: of each member, only their shown name and initials
	const event = {
		...found,
		positions: found.positions.map((position) => ({
			...position,
			user: position.user ? shownMember(position.user) : null
		})),
		positionRequests: found.positionRequests.map((request) => ({
			...request,
			user: shownMember(request.user)
		}))
	};

	// Get ARTCC information for position display enhancement
	let artccInformation = null;
	if (event.rosterType !== 'none' && event.isRosterPublished) {
		try {
			artccInformation = await fetchArtccInformation();
		} catch (error) {
			logger.error('Failed to fetch ARTCC information:', error);
		}
	}

	// What the briefing modal starts from, and how long the post is before anything is typed
	const briefing = manager
		? {
				sent: !!sentBriefing,
				text: sentBriefing?.text ?? '',
				briefUrl: sentBriefing?.briefUrl ?? '',
				fixedLength: briefingDraft(
					found,
					event.positions.map(({ position, user }) => ({
						positionId: position,
						holder: user && { cid: user.cid, name: user.name }
					})),
					catalogue,
					url.origin
				).fixed
			}
		: null;

	return {
		event,
		briefing,
		bookingProblems,
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

const briefingSchema = z.object({
	text: z.string().max(DISCORD_LIMIT).default(''),
	// Larry's link buttons take http(s) addresses of up to 512 characters
	briefUrl: z
		.string()
		.trim()
		.max(512, 'Use a link of 512 characters or fewer.')
		.refine((value) => !value || /^https?:\/\/\S+$/.test(value), {
			message: 'Enter a full web address, starting with https://.'
		})
		.default('')
});

export const actions = {
	sendBriefing: async ({ locals, request, params, platform, url }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const form = await superValidate(request, zod4(briefingSchema));
		if (!form.valid) {
			return fail(400, { form, briefing: { message: 'Check the briefing and try again.' } });
		}

		const result = await sendBriefing(
			platform?.env.LARRY,
			locals.db,
			await locals.positions(),
			params.id,
			{ text: form.data.text, briefUrl: form.data.briefUrl || null },
			url.origin
		);
		if (!result.ok) {
			return fail(result.status, { form, briefing: { message: result.message } });
		}

		logger.info(`User ${locals.user?.id} sent the briefing for event ${params.id}`);
		return { form, briefing: { sent: true, missed: result.missed } };
	},

	delete: async ({ locals, params, platform }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		// Take the roster off the booking calendar while we still know who is on it
		const doomed = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});
		if (doomed) await cancelEvent(locals.bookings, locals.db, doomed);
		// The briefing post stays in Discord; the event's role goes
		await removeEventRole(platform?.env.LARRY, locals.db, params.id);
		await clearBookingProblems(locals.db, params.id);

		await locals.db.delete(eventsTable).where(eq(eventsTable.id, params.id));

		return redirect(302, '/events');
	},
	dismissBookingProblems: async ({ locals, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		await clearBookingProblems(locals.db, params.id);
		logger.info(`User ${locals.user?.id} dismissed the booking problems of event ${params.id}`);
		return { success: true };
	},

	togglePublish: async ({ locals, params }) => {
		if (!canManageEvents(locals.roles)) {
			return redirect(302, '/');
		}

		const before = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});

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

		// Publishing puts an open roster's controllers on the booking calendar; hiding takes them off
		const after = await locals.db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, params.id)
		});
		if (before && after) await syncEvent(locals.bookings, locals.db, before, after);

		return redirect(302, `/events/${params.id}`);
	},

	signUpForPosition: async ({ locals, request, params, platform, url }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const form = await superValidate(request, zod4(signUpForPositionSchema));

		// Check if user is prohibited from signing up
		if (isEventSignupProhibited(locals.roles)) {
			return fail(403, { error: 'You are not permitted to sign up for event positions', form });
		}

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

		const previous = await locals.db.query.eventPositionsTable.findFirst({
			where: and(
				eq(eventPositionsTable.position, form.data.position),
				eq(eventPositionsTable.eventId, params.id)
			),
			columns: { userId: true }
		});

		// Update the position assignment
		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: locals.session.userId,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(eventPositionsTable.position, form.data.position),
					eq(eventPositionsTable.eventId, params.id)
				)
			);

		// An open roster books people as they sign up
		if (event) {
			await syncAssignment(locals.bookings, locals.db, event, form.data.position, {
				previousUserId: previous?.userId,
				userId: locals.session.userId
			});
		}

		await refreshBriefing(platform?.env.LARRY, locals.db, locals.positions, params.id, url.origin);

		return { success: true };
	},

	unassignFromPosition: async ({ locals, request, params, platform, url }) => {
		if (!locals.session?.userId) {
			return redirect(302, '/auth/login');
		}

		const form = await superValidate(request, zod4(unassignFromPositionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const [event, previous] = await Promise.all([
			locals.db.query.eventsTable.findFirst({ where: eq(eventsTable.id, params.id) }),
			locals.db.query.eventPositionsTable.findFirst({
				where: and(
					eq(eventPositionsTable.position, form.data.position),
					eq(eventPositionsTable.eventId, params.id)
				),
				columns: { userId: true }
			})
		]);

		// Update the position to unassign
		await locals.db
			.update(eventPositionsTable)
			.set({
				userId: null,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(eventPositionsTable.position, form.data.position),
					eq(eventPositionsTable.eventId, params.id)
				)
			);

		if (event) {
			await syncAssignment(locals.bookings, locals.db, event, form.data.position, {
				previousUserId: previous?.userId,
				userId: null
			});
		}

		await refreshBriefing(platform?.env.LARRY, locals.db, locals.positions, params.id, url.origin);

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
