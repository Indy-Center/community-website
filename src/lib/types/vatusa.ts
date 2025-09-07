export type VatusaRosterResponse = {
	data: VatusaRosterMember[];
};

export type VatusaRole = {
	id: number;
	cid: number;
	facility: string;
	role: string;
	created_at: string;
};

export type VatusaRosterMember = {
	cid: number;
	fname: string;
	lname: string;
	email: string | null;
	facility: string;
	rating: number;
	created_at: string;
	updated_at: string;
	flag_needbasic: boolean;
	flag_xferOverride: boolean;
	facility_join: string;
	flag_homecontroller: boolean;
	lastactivity: string;
	flag_broadcastOptedIn: string | null;
	flag_preventStaffAssign: string | null;
	discord_id: number;
	last_cert_sync: string;
	flag_nameprivacy: boolean;
	last_competency_date: string | null;
	promotion_eligible: boolean;
	transfer_eligible: string | null;
	roles: VatusaRole[];
	rating_short: string;
	isMentor: boolean;
	isSupIns: boolean;
	last_promotion: string | null;
	membership: string;
};