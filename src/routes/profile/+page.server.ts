import { usersTable } from '$lib/db/schema/users';
import { feedbackTable } from '$lib/db/schema/feedback';
import { profileSchema } from '$lib/forms/profile';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { logger } from '$lib/server/logger';

const submitter = alias(usersTable, 'submitter');

export const load = async ({ locals, url }) => {
	if (!locals.user) {
		return redirect(302, `/login/connect?returnUrl=${encodeURIComponent(url.pathname)}`);
	}

	const form = await superValidate({ bio: locals.user.bio ?? '' }, zod4(profileSchema));

	// Approved feedback about this user, at every rating
	const rows = await locals.db
		.select({
			id: feedbackTable.id,
			rating: feedbackTable.rating,
			position: feedbackTable.position,
			callsign: feedbackTable.callsign,
			feedback: feedbackTable.feedback,
			createdAt: feedbackTable.createdAt,
			submitterFirstName: submitter.firstName,
			submitterLastName: submitter.lastName,
			submitterPreferredName: submitter.preferredName
		})
		.from(feedbackTable)
		.leftJoin(submitter, eq(submitter.id, feedbackTable.submitterId))
		.where(
			and(eq(feedbackTable.controllerId, locals.user.id), eq(feedbackTable.status, 'approved'))
		)
		.orderBy(desc(feedbackTable.createdAt));

	// Pilots who gave their callsign are shown by their preferred name, or first name and
	// last initial ("Tom M.") if they haven't set one; the rest stay anonymous, and their
	// name never leaves the server
	const feedback = rows.map((row) => {
		const callsign = row.callsign?.trim() || null;
		const preferredName = row.submitterPreferredName?.trim();
		const firstName = row.submitterFirstName?.trim();
		const lastInitial = row.submitterLastName?.trim().charAt(0);
		const shortName = firstName && (lastInitial ? `${firstName} ${lastInitial}.` : firstName);
		const submitterName = callsign ? preferredName || shortName || null : null;

		return {
			id: row.id,
			rating: row.rating,
			position: row.position,
			feedback: row.feedback,
			createdAt: row.createdAt,
			callsign,
			submitterName
		};
	});

	return {
		form,
		feedback,
		isController: locals.user.membership === 'controller'
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return redirect(302, '/login/connect');
		}

		const form = await superValidate(request, zod4(profileSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		logger.debug('Updating user profile', { userId: locals.user.id });

		await locals.db
			.update(usersTable)
			.set({ bio: form.data.bio || null })
			.where(eq(usersTable.id, locals.user.id));

		form.message = 'Profile saved';
		return { form };
	}
};
