import { feedbackSchema } from '$lib/forms/feedback';

import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { feedbackTable } from '$lib/db/schema/feedback';
import { eq } from 'drizzle-orm';
import { usersTable } from '$lib/db/schema/users.js';
import { notifyDiscordOfFeedback } from '$lib/server/discord';
import { logger } from '$lib/server/logger';

export const load = async ({ locals, params, url }) => {
	const form = await superValidate(zod4(feedbackSchema));

	const controllers = await locals.db.query.usersTable.findMany({
		where: eq(usersTable.membership, 'controller')
	});

	// Sort controllers by display name (preferred name if available, otherwise first + last name)
	controllers.sort((a, b) => {
		const nameA = a.preferredName || `${a.firstName} ${a.lastName}`;
		const nameB = b.preferredName || `${b.firstName} ${b.lastName}`;
		return nameA.localeCompare(nameB);
	});

	return {
		form,
		controllers,
		user: locals.user
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		// You must be logged in to submit feedback
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const form = await superValidate(request, zod4(feedbackSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		logger.info(`Saving new feedback for controller "${form.data.controllerId}"`);
		const [feedback] = await locals.db
			.insert(feedbackTable)
			.values({
				id: crypto.randomUUID(),
				submitterId: locals.user.id,
				controllerId: form.data.controllerId,
				rating: form.data.rating,
				status: form.data.status,
				position: form.data.position,
				callsign: form.data.callsign,
				feedback: form.data.feedback
			})
			.returning();

		await notifyDiscordOfFeedback(locals.db, feedback);

		form.message = 'Feedback submitted successfully!';
		return { form };
	}
};
