import { addVisitor, checkTransferChecklist } from '$lib/server/vatsim/vatusaDataClient';

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
	addVisitor: async ({ locals, request }) => {
		const { user } = locals;

		const { canVisit } = await checkTransferChecklist(user.cid);

		if (!canVisit) {
			return { success: false, error: 'You are not eligible to visit.' };
		}

		await addVisitor(user.cid);

		return { success: true };
	}
};
