import { feedbackTable, type Feedback } from '$lib/db/schema/feedback';
import {
	announcePublishedFeedback,
	notifyDiscordOfFeedbackStatusChange
} from '$lib/server/discord';
import { getFeedbackReviewers, logFeedbackEvent, pilotDisplayName } from '$lib/server/feedback';
import { logger } from '$lib/server/logger';
import { RATING_STARS } from '$lib/utils/feedbackRatings';
import { PUBLISH_MODES, type FeedbackStatus, type PublishMode } from '$lib/utils/feedbackReview';
import { canReviewFeedback } from '$lib/utils/permissions';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const load = async ({ locals, params }) => {
	if (!canReviewFeedback(locals.roles)) {
		return redirect(302, '/admin');
	}

	const feedback = await locals.db.query.feedbackTable.findFirst({
		where: eq(feedbackTable.id, params.id),
		with: {
			submitter: true,
			controller: true,
			assignee: true,
			events: {
				orderBy: (event, { asc }) => [asc(event.createdAt)],
				with: {
					user: { columns: { firstName: true, lastName: true, preferredName: true } }
				}
			}
		}
	});

	if (!feedback) {
		error(404, 'Feedback not found');
	}

	// Pre-fill the publish form with the submission; once published, show what went out
	const publishDraft = {
		rating: feedback.publishedRating ?? feedback.rating,
		position: feedback.publishedPosition ?? feedback.position,
		callsign: feedback.publishedCallsign ?? feedback.callsign ?? '',
		pilotName: feedback.publishedPilotName ?? pilotDisplayName(feedback.submitter) ?? '',
		feedback: feedback.publishedFeedback ?? feedback.feedback ?? ''
	};

	return {
		feedback,
		publishDraft,
		reviewers: await getFeedbackReviewers(locals.db),
		userId: locals.user?.id
	};
};

const noteSchema = z.object({
	note: z.string().max(2000).optional()
});

const followUpSchema = noteSchema.extend({
	assigneeId: z.string().optional()
});

const assignSchema = z.object({
	assigneeId: z.string().optional()
});

const commentSchema = z.object({
	type: z.enum(['comment', 'action']),
	body: z.string().trim().min(1, 'Write something first').max(4000)
});

const publishSchema = z.object({
	mode: z.enum(PUBLISH_MODES),
	rating: z.string().refine((rating) => rating in RATING_STARS, 'Pick a rating'),
	position: z.string().trim().min(1, 'Position is required').max(100),
	callsign: z.string().trim().max(20).optional(),
	pilotName: z.string().trim().max(100).optional(),
	feedback: z.string().trim().max(4000).optional()
});

const acceptAndPublishSchema = noteSchema.extend({
	mode: z.enum(PUBLISH_MODES)
});

// Read a form with a schema, returning the parsed data or a 400 with the first error
async function parseForm<T extends z.ZodType>(request: Request, schema: T) {
	const formData = Object.fromEntries(await request.formData());
	const result = schema.safeParse(formData);
	if (!result.success) {
		return { error: fail(400, { message: result.error.issues[0]?.message ?? 'Invalid form' }) };
	}
	return { data: result.data as z.infer<T> };
}

async function getFeedback(locals: App.Locals, id: string) {
	return locals.db.query.feedbackTable.findFirst({ where: eq(feedbackTable.id, id) });
}

// Status changes allowed from each status. Published feedback can't change status because
// the Discord post can't be taken back.
const TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
	pending: ['approved', 'follow_up', 'rejected'],
	follow_up: ['approved', 'rejected'],
	approved: ['follow_up', 'rejected'],
	rejected: ['approved', 'follow_up']
};

function canMoveTo(feedback: Feedback, status: FeedbackStatus) {
	return !feedback.publishMode && TRANSITIONS[feedback.status]?.includes(status);
}

async function changeStatus(
	locals: App.Locals,
	id: string,
	status: FeedbackStatus,
	note: string | undefined,
	assigneeId?: string | null
) {
	if (!canReviewFeedback(locals.roles) || !locals.user) {
		logger.warn(`Unauthorized feedback status change attempt by user ${locals.user?.id}`);
		return fail(403, { message: 'Unauthorized' });
	}

	const existing = await getFeedback(locals, id);
	if (!existing) return fail(404, { message: 'Feedback not found' });
	if (!canMoveTo(existing, status)) {
		return fail(400, { message: `This feedback can't be moved to that status` });
	}

	logger.info(`Reviewer ${locals.user.id} moving feedback ${id} to ${status}`);

	try {
		const [feedback] = await locals.db
			.update(feedbackTable)
			.set({
				status,
				// Only follow ups have an assignee
				assigneeId: status === 'follow_up' ? assigneeId || null : null,
				updatedAt: new Date()
			})
			.where(eq(feedbackTable.id, id))
			.returning();

		await logFeedbackEvent(locals.db, {
			feedbackId: id,
			userId: locals.user.id,
			type: 'status',
			value: status,
			body: note
		});

		if (status === 'follow_up' && feedback.assigneeId) {
			await logFeedbackEvent(locals.db, {
				feedbackId: id,
				userId: locals.user.id,
				type: 'assigned',
				value: feedback.assigneeId
			});
		}

		await notifyDiscordOfFeedbackStatusChange(locals.db, feedback, locals.user);
		return { success: true };
	} catch (err) {
		logger.error(`Failed to move feedback ${id} to ${status}`, err);
		return fail(500, { message: 'Failed to update feedback' });
	}
}

export const actions = {
	accept: async ({ request, locals, params }) => {
		const form = await parseForm(request, noteSchema);
		if (form.error) return form.error;
		return changeStatus(locals, params.id, 'approved', form.data.note);
	},

	reject: async ({ request, locals, params }) => {
		const form = await parseForm(request, noteSchema);
		if (form.error) return form.error;
		return changeStatus(locals, params.id, 'rejected', form.data.note);
	},

	followUp: async ({ request, locals, params }) => {
		const form = await parseForm(request, followUpSchema);
		if (form.error) return form.error;

		const assigneeId = form.data.assigneeId || null;
		if (assigneeId) {
			const reviewers = await getFeedbackReviewers(locals.db);
			if (!reviewers.some((r) => r.id === assigneeId)) {
				return fail(400, { message: 'Assignee must be a feedback reviewer' });
			}
		}

		return changeStatus(locals, params.id, 'follow_up', form.data.note, assigneeId);
	},

	assign: async ({ request, locals, params }) => {
		if (!canReviewFeedback(locals.roles) || !locals.user) {
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, assignSchema);
		if (form.error) return form.error;

		const existing = await getFeedback(locals, params.id);
		if (!existing) return fail(404, { message: 'Feedback not found' });
		if (existing.status !== 'follow_up') {
			return fail(400, { message: 'Only follow ups can be assigned' });
		}

		const assigneeId = form.data.assigneeId || null;
		if (assigneeId === existing.assigneeId) return { success: true };
		if (assigneeId) {
			const reviewers = await getFeedbackReviewers(locals.db);
			if (!reviewers.some((r) => r.id === assigneeId)) {
				return fail(400, { message: 'Assignee must be a feedback reviewer' });
			}
		}

		await locals.db
			.update(feedbackTable)
			.set({ assigneeId, updatedAt: new Date() })
			.where(eq(feedbackTable.id, params.id));

		await logFeedbackEvent(locals.db, {
			feedbackId: params.id,
			userId: locals.user.id,
			type: 'assigned',
			value: assigneeId
		});

		logger.info(`Reviewer ${locals.user.id} assigned feedback ${params.id} to ${assigneeId}`);
		return { success: true };
	},

	comment: async ({ request, locals, params }) => {
		if (!canReviewFeedback(locals.roles) || !locals.user) {
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, commentSchema);
		if (form.error) return form.error;

		const existing = await getFeedback(locals, params.id);
		if (!existing) return fail(404, { message: 'Feedback not found' });

		await logFeedbackEvent(locals.db, {
			feedbackId: params.id,
			userId: locals.user.id,
			type: form.data.type,
			body: form.data.body
		});

		return { success: true };
	},

	publish: async ({ request, locals, params }) => {
		if (!canReviewFeedback(locals.roles) || !locals.user) {
			logger.warn(`Unauthorized feedback publish attempt by user ${locals.user?.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, publishSchema);
		if (form.error) return form.error;

		const existing = await getFeedback(locals, params.id);
		if (!existing) return fail(404, { message: 'Feedback not found' });
		if (existing.status !== 'approved') {
			return fail(400, { message: 'Only accepted feedback can be published' });
		}
		if (existing.publishMode) {
			return fail(400, { message: 'This feedback has already been published' });
		}

		const { mode, ...values } = form.data;
		const posted = await publishFeedback(locals, params.id, mode, values);
		return { success: true, posted };
	},

	// Quick action for new feedback: accept, then publish the submission as it was sent
	acceptAndPublish: async ({ request, locals, params }) => {
		const form = await parseForm(request, acceptAndPublishSchema);
		if (form.error) return form.error;

		const accepted = await changeStatus(locals, params.id, 'approved', form.data.note);
		if (!('success' in accepted)) return accepted;

		const feedback = await locals.db.query.feedbackTable.findFirst({
			where: eq(feedbackTable.id, params.id),
			with: { submitter: true }
		});
		if (!feedback) return fail(404, { message: 'Feedback not found' });

		const posted = await publishFeedback(locals, params.id, form.data.mode, {
			rating: feedback.rating,
			position: feedback.position,
			callsign: feedback.callsign ?? undefined,
			pilotName: pilotDisplayName(feedback.submitter) ?? undefined,
			feedback: feedback.feedback ?? undefined
		});
		return { success: true, posted };
	}
};

// Saves what gets published, posts it to Discord, and logs it. Returns whether Discord got it.
async function publishFeedback(
	locals: App.Locals,
	id: string,
	mode: PublishMode,
	values: Omit<z.infer<typeof publishSchema>, 'mode'>
) {
	const identified = mode === 'identified';

	logger.info(`Reviewer ${locals.user!.id} publishing feedback ${id} as ${mode}`);

	// De-identified feedback never stores the pilot's details, so they can't leak later
	const [feedback] = await locals.db
		.update(feedbackTable)
		.set({
			publishMode: mode,
			publishedAt: new Date(),
			publishedRating: values.rating,
			publishedPosition: values.position,
			publishedCallsign: identified ? values.callsign || null : null,
			publishedPilotName: identified ? values.pilotName || null : null,
			publishedFeedback: values.feedback || null,
			updatedAt: new Date()
		})
		.where(eq(feedbackTable.id, id))
		.returning();

	const posted = await announcePublishedFeedback(locals.db, feedback);

	await logFeedbackEvent(locals.db, {
		feedbackId: id,
		userId: locals.user!.id,
		type: 'published',
		value: mode,
		body: posted ? null : 'The Discord post failed; the feedback is still on the profile.'
	});

	return posted;
}
