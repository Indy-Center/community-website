import type { User } from '$lib/db/schema/users';
import { DiscordChannel, sendDiscordEmbed } from '$lib/server/discord';
import { addVisitor, checkTransferChecklist } from '$lib/server/vatsim/vatusaDataClient';
import type { Actions, RequestEvent } from '@sveltejs/kit';

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

		const { canVisit } = await checkTransferChecklist(user.cid);

		if (!canVisit) {
			return { success: false, error: 'You are not eligible to visit.' };
		}

		await addVisitor(user.cid);

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
