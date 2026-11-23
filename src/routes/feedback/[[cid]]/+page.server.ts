import { feedbackSchema } from '$lib/forms/feedback';

import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { feedbackTable } from '$lib/db/schema/feedback';
import { eq } from 'drizzle-orm';
import { usersTable } from '$lib/db/schema/users.js';
import { enqueueWithLarry, newFeedbackAlert } from '$lib/server/discord';
import { fetchAlertPeople } from '$lib/server/feedback';
import { logger } from '$lib/server/logger';
import { pickableShownMember, pickableShownMemberQuery } from '$lib/members';

export const load = async ({ locals, params, url }) => {
	const form = await superValidate(zod4(feedbackSchema));

	// Page data goes to every visitor's browser: only what the controller picker shows and searches
	const controllers = (
		await locals.db.query.usersTable.findMany({
			where: eq(usersTable.membership, 'controller'),
			...pickableShownMemberQuery
		})
	)
		.map(pickableShownMember)
		.sort((a, b) => a.name.localeCompare(b.name));

	// /feedback/<cid> links pre-select that controller so they can share their own feedback link
	if (params.cid) {
		const controller = controllers.find((c) => c.cid === params.cid);
		if (controller) form.data.controllerId = controller.id;
	}

	return {
		form,
		controllers,
		user: locals.user
	};
};

export const actions = {
	default: async ({ request, locals, platform, url }) => {
		// You must be logged in to submit feedback
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const form = await superValidate(request, zod4(feedbackSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		logger.info(
			`User ${locals.user.id} submitted feedback for controller "${form.data.controllerId}"`
		);
		const [feedback] = await locals.db
			.insert(feedbackTable)
			.values({
				id: crypto.randomUUID(),
				submitterId: locals.user.id,
				controllerId: form.data.controllerId,
				rating: form.data.rating,
				// Every submission starts as new feedback; staff move it through review
				status: 'pending',
				position: form.data.position,
				callsign: form.data.callsign,
				feedback: form.data.feedback
			})
			.returning();

		const people = await fetchAlertPeople(locals.db, [feedback.submitterId, feedback.controllerId]);
		const submitter = people.get(feedback.submitterId);
		const controller = people.get(feedback.controllerId);
		if (submitter && controller) {
			await enqueueWithLarry(
				platform?.env.LARRY,
				newFeedbackAlert(
					feedback,
					{ submitter, controller },
					`${url.origin}/admin/feedback/${feedback.id}`
				)
			);
		}

		form.message = 'Feedback submitted successfully!';
		return { form };
	}
};
