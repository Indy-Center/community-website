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

		await addVisitor(user.cid);

		return { success: true };
	}
};
