import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { staffingRequestSchema } from '$lib/forms/staffing';
import { staffingRequestMessage } from '$lib/server/staffing';
import { logger } from '$lib/server/logger';

export type StaffingMessage = { type: 'success' | 'error'; text: string };

export const load = async ({ locals }) => {
	return {
		form: await superValidate(zod4(staffingRequestSchema)),
		signedIn: !!locals.user
	};
};

export const actions = {
	default: async ({ request, locals, platform }) => {
		// Requests are tied to a VATSIM account, which keeps out spam
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const form = await superValidate(request, zod4(staffingRequestSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const user = locals.user;
		const name = user.preferredName || `${user.firstName} ${user.lastName}`;

		try {
			const larry = platform?.env.LARRY;
			if (!larry) throw new Error('The LARRY binding is not set');
			await larry.send(staffingRequestMessage(form.data, { name, cid: user.cid }));
		} catch (error) {
			logger.error(`Couldn't send ${user.id}'s staffing request to Discord`, error);
			return message(
				form,
				{
					type: 'error',
					text: "We couldn't send your request. Please try again in a few minutes."
				} satisfies StaffingMessage,
				{ status: 502 }
			);
		}

		logger.info(`User ${user.id} requested staffing for "${form.data.eventName}"`);
		return message(form, {
			type: 'success',
			text: 'Request sent! Our Events Team will reach out using the contact details you gave.'
		} satisfies StaffingMessage);
	}
};
