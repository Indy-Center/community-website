import type {
	VatusaRosterResponse,
	VatusaTransferChecklist,
	VatusaTransferChecklistResponse
} from '$lib/types/vatusa';
import { env } from '$env/dynamic/private';
import { FACILITY_ID } from '$lib/config';
import { logger } from '$lib/server/logger';

const VATUSA_API_BASE_URL = 'https://api.vatusa.net';

export async function fetchRoster(
	membership: 'home' | 'visit' | 'both' = 'both',
	artcc: string = FACILITY_ID
) {
	const url = `${VATUSA_API_BASE_URL}/facility/${artcc}/roster/${membership}`;
	const response = await fetch(url).then((res) => res.json());
	const { data } = response as VatusaRosterResponse;

	return data;
}

export async function checkTransferChecklist(cid: string, artcc: string = FACILITY_ID) {
	logger.debug(`Checking eligibility for CID ${cid}`);

	const url = `${VATUSA_API_BASE_URL}/user/${cid}/transfer/checklist?apikey=${env.VATUSA_API_KEY}`;
	const response = await fetch(url).then((res) => res.json());
	const { data } = response as VatusaTransferChecklistResponse;

	const canVisit = isVisitingEligible(data);
	const canTransfer = isTransferEligible(data);

	logger.info(`Eligibility check for CID ${cid}: Visit=${canVisit}, Transfer=${canTransfer}`);
	logger.debug(`VATUSA eligibility response for CID ${cid}`, { checklist: data });

	return {
		checklist: data,
		canVisit,
		canTransfer
	};
}

export async function addVisitor(cid: string, artcc: string = FACILITY_ID) {
	logger.info(`Adding visitor CID ${cid} to facility ${artcc}`);

	const url = `${VATUSA_API_BASE_URL}/facility/${artcc}/roster/manageVisitor/${cid}?apikey=${env.VATUSA_API_KEY}`;
	const response = await fetch(url, {
		method: 'POST'
	}).then((res) => res.json());

	if (response.status === 'OK') {
		logger.info(`Successfully added visitor CID ${cid} to facility ${artcc}`);
	} else {
		logger.error(`Failed to add visitor CID ${cid}`, { response });
	}

	return response;
}

function isVisitingEligible(checklist: VatusaTransferChecklist) {
	return (
		// VATUSA Controller
		checklist.homecontroller === true &&
		// Has Home Facility
		checklist.hasHome === true &&
		// Basic Exam Complete
		checklist.needbasic === true &&
		// 50+ Hours Controlling
		checklist['50hrs'] === true &&
		// 90+ Days Since Promotion
		checklist.promo === true &&
		// S3+ Rating
		checklist.hasRating === true
	);
}

function isTransferEligible(checklist: VatusaTransferChecklist) {
	return (
		// Basic Exam Complete
		checklist.needbasic === true &&
		// 90+ Days Since Transfer
		checklist['90days'] === true &&
		// 50+ Hours Since Promotion
		checklist['50hrs'] === true &&
		// No Staff Position
		checklist.staff === true &&
		// Not an I1/I3 Rating
		checklist.instructor === true &&
		// No Pending Transfers
		checklist.pending === true
	);
}
