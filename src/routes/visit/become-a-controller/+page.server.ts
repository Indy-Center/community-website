import type { User } from '$lib/db/schema/users';
import { DiscordChannel, sendDiscordEmbed } from '$lib/server/discord';
import { addVisitor, checkTransferChecklist } from '$lib/server/vatsim/vatusaDataClient';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

export const load = async ({ locals }) => {
	const { user } = locals;

	const { checklist, canVisit, canTransfer } = await checkTransferChecklist(user.cid);

	return {
		checklist,
		canVisit,
		canTransfer
	};
};

export const actions = {
	addVisitor: async ({ locals }: RequestEvent) => {
		const user = locals.user as User;

		logger.info(`User ${user.id} (CID ${user.cid}) initiated visitor application`);

		const { canVisit } = await checkTransferChecklist(user.cid);

		if (!canVisit) {
			logger.warn(`Visitor application denied for CID ${user.cid}: not eligible`);
			return { success: false, error: 'You are not eligible to visit.' };
		}

		await addVisitor(user.cid);

		logger.info(`Visitor application submitted for CID ${user.cid} (${user.firstName} ${user.lastName})`);

		await sendDiscordEmbed(DiscordChannel.SENIOR_STAFF_ALERTS, {
			title: 'Incoming New Visitor',
			description: `User ${user.firstName} ${user.lastName} (${user.cid}) has submitted a visiting request.
			They will be automatically promoted during the next roster update.`,
			color: 0x00ff00,
			fields: [],
			footer: { text: null },
			timestamp: new Date().toISOString()
		});

		return { success: true };
	}
} satisfies Actions;
