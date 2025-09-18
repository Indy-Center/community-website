import type {
	VatusaRosterResponse,
	VatusaTransferChecklist,
	VatusaTransferChecklistResponse
} from '$lib/types/vatusa';
import { env } from '$env/dynamic/private';

const VATUSA_API_BASE_URL = 'https://api.vatusa.net';

const ARTCC = 'ZID';

export async function fetchRoster(artcc: string, membership: 'home' | 'visit' | 'both' = 'both') {
	const url = `${VATUSA_API_BASE_URL}/facility/${artcc}/roster/${membership}`;
	const response = await fetch(url).then((res) => res.json());
	const { data } = response as VatusaRosterResponse;

	return data;
}

export async function checkTransferChecklist(cid: string) {
	const url = `${VATUSA_API_BASE_URL}/user/${cid}/transfer/checklist?apikey=${env.VATUSA_API_KEY}`;
	const response = await fetch(url).then((res) => res.json());
	const { data } = response as VatusaTransferChecklistResponse;

	const canVisit = isVisitingEligible(data);
	const canTransfer = isTransferEligible(data);

	return {
		checklist: data,
		canVisit,
		canTransfer
	};
}

export async function addVisitor(cid: string) {
	const url = `${VATUSA_API_BASE_URL}/facility/${ARTCC}/roster/manageVisitor/${cid}?apikey=${env.VATUSA_API_KEY}`;
	const response = await fetch(url, {
		method: 'POST'
	}).then((res) => res.json());

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
