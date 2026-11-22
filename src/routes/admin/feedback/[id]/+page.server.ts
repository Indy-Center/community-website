import { feedbackEventsTable, feedbackTable, type Feedback } from '$lib/db/schema/feedback';
import type { User } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { enqueueWithLarry, followUpAlert, publishedFeedbackPost } from '$lib/server/discord';
import {
	feedbackEventInsert,
	fetchAlertPeople,
	getFeedbackReviewers,
	pilotDisplayName
} from '$lib/server/feedback';
import type { LarryBinding } from '$lib/server/larry';
import { logger } from '$lib/server/logger';
import { memberPickerColumns } from '$lib/members';
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

	const [feedback, reviewers] = await Promise.all([
		locals.db.query.feedbackTable.findFirst({
			where: eq(feedbackTable.id, params.id),
			// Page data reaches the browser: names only, plus the pilot's email so a reviewer can
			// reach them on a follow up. Never whole user rows.
			with: {
				submitter: { columns: { ...memberPickerColumns, email: true } },
				controller: { columns: memberPickerColumns },
				assignee: { columns: memberPickerColumns },
				events: {
					orderBy: (event, { asc }) => [asc(event.createdAt)],
					with: { user: { columns: memberPickerColumns } }
				}
			}
		}),
		getFeedbackReviewers(locals.db)
	]);

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
		reviewers,
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

type PublishValues = Omit<z.infer<typeof publishSchema>, 'mode'>;

// Read a form with a schema, returning the parsed data or a 400 with the first error
async function parseForm<T extends z.ZodType>(request: Request, schema: T) {
	const formData = Object.fromEntries(await request.formData());
	const result = schema.safeParse(formData);
	if (!result.success) {
		return { error: fail(400, { message: result.error.issues[0]?.message ?? 'Invalid form' }) };
	}
	return { data: result.data as z.infer<T> };
}

async function getFeedback(db: Database, id: string) {
	return db.query.feedbackTable.findFirst({ where: eq(feedbackTable.id, id) });
}

// The signed-in user, if they may work feedback
function reviewer(locals: App.Locals) {
	return canReviewFeedback(locals.roles) ? locals.user : undefined;
}

async function isReviewer(db: Database, userId: string) {
	const reviewers = await getFeedbackReviewers(db);
	return reviewers.some((r) => r.id === userId);
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

// The columns a status change sets. Only follow ups have an assignee.
function statusColumns(status: FeedbackStatus, assigneeId?: string | null) {
	return { status, assigneeId: status === 'follow_up' ? assigneeId || null : null };
}

// The columns publishing sets. De-identified feedback never stores the pilot's details, so they
// can't leak later.
function publishColumns(mode: PublishMode, values: PublishValues) {
	const identified = mode === 'identified';
	return {
		publishMode: mode,
		publishedAt: new Date(),
		publishedRating: values.rating,
		publishedPosition: values.position,
		publishedCallsign: identified ? values.callsign || null : null,
		publishedPilotName: identified ? values.pilotName || null : null,
		publishedFeedback: values.feedback || null
	};
}

// Queues senior staff's alert that a saved follow up needs working: by its assignee, or by
// whoever picks it up. Nothing else a reviewer does is alerted; it's on the feedback's page.
async function queueFollowUpAlert(
	db: Database,
	larry: LarryBinding | undefined,
	feedback: Feedback,
	by: User,
	origin: string
) {
	const people = await fetchAlertPeople(db, [feedback.controllerId, feedback.assigneeId]);
	const controller = people.get(feedback.controllerId);
	if (!controller) {
		logger.warn(`Controller ${feedback.controllerId} not found, skipping follow up alert`);
		return;
	}
	await enqueueWithLarry(
		larry,
		followUpAlert(
			feedback,
			{
				controller,
				by,
				assignee: feedback.assigneeId ? people.get(feedback.assigneeId) : undefined
			},
			`${origin}/admin/feedback/${feedback.id}`
		)
	);
}

/**
 * Queues the public Discord post for feedback that has been published as identified. Returns
 * whether Larry took it, or null for de-identified feedback, which isn't posted. If it fails, the
 * publish log entry (`publishedEventId`) says so; the feedback stays published either way.
 */
async function queuePublishedPost(
	db: Database,
	larry: LarryBinding | undefined,
	feedback: Feedback,
	publishedEventId: string
) {
	if (feedback.publishMode !== 'identified') return null;

	const people = await fetchAlertPeople(db, [feedback.controllerId]);
	const controller = people.get(feedback.controllerId);
	if (!controller) {
		logger.warn(`Controller ${feedback.controllerId} not found, skipping feedback announcement`);
	}
	const posted =
		!!controller && (await enqueueWithLarry(larry, publishedFeedbackPost(feedback, controller)));

	if (!posted) {
		try {
			await db
				.update(feedbackEventsTable)
				.set({ body: "The Discord post couldn't be queued; the feedback is still on the profile." })
				.where(eq(feedbackEventsTable.id, publishedEventId));
		} catch (err) {
			logger.error(`Couldn't note the failed Discord post on feedback ${feedback.id}`, err);
		}
	}
	return posted;
}

// Saves a status change and its log entries. Returns the saved feedback, or the failure to send
async function changeStatus(
	locals: App.Locals,
	id: string,
	status: FeedbackStatus,
	note: string | undefined,
	assigneeId?: string | null
) {
	const user = reviewer(locals);
	if (!user) {
		logger.warn(`Unauthorized feedback status change attempt by user ${locals.user?.id}`);
		return { failure: fail(403, { message: 'Unauthorized' }) };
	}

	const db = locals.db;
	const existing = await getFeedback(db, id);
	if (!existing) return { failure: fail(404, { message: 'Feedback not found' }) };
	if (!canMoveTo(existing, status)) {
		return { failure: fail(400, { message: `This feedback can't be moved to that status` }) };
	}

	logger.info(`Reviewer ${user.id} moving feedback ${id} to ${status}`);

	const columns = statusColumns(status, assigneeId);
	try {
		// The change and its log entries are saved together or not at all
		const [[feedback]] = await db.batch([
			db
				.update(feedbackTable)
				.set({ ...columns, updatedAt: new Date() })
				.where(eq(feedbackTable.id, id))
				.returning(),
			feedbackEventInsert(db, {
				feedbackId: id,
				userId: user.id,
				type: 'status',
				value: status,
				body: note
			}),
			...(columns.assigneeId
				? [
						feedbackEventInsert(db, {
							feedbackId: id,
							userId: user.id,
							type: 'assigned',
							value: columns.assigneeId
						})
					]
				: [])
		]);
		return { feedback, user };
	} catch (err) {
		logger.error(`Failed to move feedback ${id} to ${status}`, err);
		return { failure: fail(500, { message: 'Failed to update feedback' }) };
	}
}

export const actions = {
	accept: async ({ request, locals, params }) => {
		const form = await parseForm(request, noteSchema);
		if (form.error) return form.error;
		const saved = await changeStatus(locals, params.id, 'approved', form.data.note);
		return saved.failure ?? { success: true };
	},

	reject: async ({ request, locals, params }) => {
		const form = await parseForm(request, noteSchema);
		if (form.error) return form.error;
		const saved = await changeStatus(locals, params.id, 'rejected', form.data.note);
		return saved.failure ?? { success: true };
	},

	followUp: async ({ request, locals, params, platform, url }) => {
		const form = await parseForm(request, followUpSchema);
		if (form.error) return form.error;

		const assigneeId = form.data.assigneeId || null;
		if (assigneeId && !(await isReviewer(locals.db, assigneeId))) {
			return fail(400, { message: 'Assignee must be a feedback reviewer' });
		}

		const saved = await changeStatus(locals, params.id, 'follow_up', form.data.note, assigneeId);
		if (saved.failure) return saved.failure;

		await queueFollowUpAlert(
			locals.db,
			platform?.env.LARRY,
			saved.feedback,
			saved.user,
			url.origin
		);
		return { success: true };
	},

	assign: async ({ request, locals, params, platform, url }) => {
		const user = reviewer(locals);
		if (!user) {
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, assignSchema);
		if (form.error) return form.error;

		const db = locals.db;
		const existing = await getFeedback(db, params.id);
		if (!existing) return fail(404, { message: 'Feedback not found' });
		if (existing.status !== 'follow_up') {
			return fail(400, { message: 'Only follow ups can be assigned' });
		}

		const assigneeId = form.data.assigneeId || null;
		if (assigneeId === existing.assigneeId) return { success: true };
		if (assigneeId && !(await isReviewer(db, assigneeId))) {
			return fail(400, { message: 'Assignee must be a feedback reviewer' });
		}

		const [[feedback]] = await db.batch([
			db
				.update(feedbackTable)
				.set({ assigneeId, updatedAt: new Date() })
				.where(eq(feedbackTable.id, params.id))
				.returning(),
			feedbackEventInsert(db, {
				feedbackId: params.id,
				userId: user.id,
				type: 'assigned',
				value: assigneeId
			})
		]);

		logger.info(`Reviewer ${user.id} assigned feedback ${params.id} to ${assigneeId}`);
		await queueFollowUpAlert(db, platform?.env.LARRY, feedback, user, url.origin);
		return { success: true };
	},

	comment: async ({ request, locals, params }) => {
		const user = reviewer(locals);
		if (!user) {
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, commentSchema);
		if (form.error) return form.error;

		const existing = await getFeedback(locals.db, params.id);
		if (!existing) return fail(404, { message: 'Feedback not found' });

		await feedbackEventInsert(locals.db, {
			feedbackId: params.id,
			userId: user.id,
			type: form.data.type,
			body: form.data.body
		});

		return { success: true };
	},

	publish: async ({ request, locals, params, platform }) => {
		const user = reviewer(locals);
		if (!user) {
			logger.warn(`Unauthorized feedback publish attempt by user ${locals.user?.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, publishSchema);
		if (form.error) return form.error;

		const db = locals.db;
		const existing = await getFeedback(db, params.id);
		if (!existing) return fail(404, { message: 'Feedback not found' });
		if (existing.status !== 'approved') {
			return fail(400, { message: 'Only accepted feedback can be published' });
		}
		if (existing.publishMode) {
			return fail(400, { message: 'This feedback has already been published' });
		}

		const { mode, ...values } = form.data;
		logger.info(`Reviewer ${user.id} publishing feedback ${params.id} as ${mode}`);

		const publishedEventId = crypto.randomUUID();
		let feedback: Feedback;
		try {
			const [[updated]] = await db.batch([
				db
					.update(feedbackTable)
					.set({ ...publishColumns(mode, values), updatedAt: new Date() })
					.where(eq(feedbackTable.id, params.id))
					.returning(),
				feedbackEventInsert(db, {
					id: publishedEventId,
					feedbackId: params.id,
					userId: user.id,
					type: 'published',
					value: mode
				})
			]);
			feedback = updated;
		} catch (err) {
			logger.error(`Failed to publish feedback ${params.id}`, err);
			return fail(500, { message: 'Failed to publish feedback' });
		}

		const posted = await queuePublishedPost(db, platform?.env.LARRY, feedback, publishedEventId);
		return { success: true, posted };
	},

	// Quick action for new feedback: accept it and publish the submission as it was sent. Both
	// are saved in one write, so it's never left accepted but unpublished.
	acceptAndPublish: async ({ request, locals, params, platform }) => {
		const user = reviewer(locals);
		if (!user) {
			logger.warn(`Unauthorized feedback accept and publish attempt by user ${locals.user?.id}`);
			return fail(403, { message: 'Unauthorized' });
		}

		const form = await parseForm(request, acceptAndPublishSchema);
		if (form.error) return form.error;

		const db = locals.db;
		const existing = await db.query.feedbackTable.findFirst({
			where: eq(feedbackTable.id, params.id),
			with: { submitter: true }
		});
		if (!existing) return fail(404, { message: 'Feedback not found' });
		if (!canMoveTo(existing, 'approved')) {
			return fail(400, { message: `This feedback can't be accepted` });
		}

		const { mode, note } = form.data;
		logger.info(`Reviewer ${user.id} accepting and publishing feedback ${params.id} as ${mode}`);

		const publishedEventId = crypto.randomUUID();
		let feedback: Feedback;
		try {
			const [[updated]] = await db.batch([
				db
					.update(feedbackTable)
					.set({
						...statusColumns('approved'),
						...publishColumns(mode, {
							rating: existing.rating,
							position: existing.position,
							callsign: existing.callsign ?? undefined,
							pilotName: pilotDisplayName(existing.submitter) ?? undefined,
							feedback: existing.feedback ?? undefined
						}),
						updatedAt: new Date()
					})
					.where(eq(feedbackTable.id, params.id))
					.returning(),
				feedbackEventInsert(db, {
					feedbackId: params.id,
					userId: user.id,
					type: 'status',
					value: 'approved',
					body: note
				}),
				feedbackEventInsert(db, {
					id: publishedEventId,
					feedbackId: params.id,
					userId: user.id,
					type: 'published',
					value: mode
				})
			]);
			feedback = updated;
		} catch (err) {
			logger.error(`Failed to accept and publish feedback ${params.id}`, err);
			return fail(500, { message: 'Failed to update feedback' });
		}

		const posted = await queuePublishedPost(db, platform?.env.LARRY, feedback, publishedEventId);
		return { success: true, posted };
	}
};
