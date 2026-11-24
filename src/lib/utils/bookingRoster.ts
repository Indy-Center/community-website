import { MENTOR_ROLES, T2_ENDORSEMENT } from '$lib/config/bookings';
import { ATC_RATINGS } from '$lib/config/ratings';
import type { BookingMember, RestrictionEndorsement } from '$lib/types/bookings';

// What the roster sync needs of each controller in the roster copy
export type RosterController = {
	cid: string;
	rating: string;
	roles: string[];
	endorsements: string[];
};

/**
 * Our roster as the booking system should hold it: every rostered controller, home and visiting.
 * Every field is set, because the booking system fills in anything left out (home, not a mentor).
 * Everyone is a member: we don't use the booking system's portal, so nobody manages it there.
 * Controllers whose rating has no VATSIM number of 1 or more are left out, and listed in `skipped`.
 */
export function toBookingMembers(controllers: RosterController[], homeCids: Set<string>) {
	const members: BookingMember[] = [];
	const skipped: string[] = [];

	for (const controller of controllers) {
		const rating = ATC_RATINGS[controller.rating]?.id ?? 0;
		if (rating < 1) {
			skipped.push(controller.cid);
			continue;
		}
		members.push({
			cid: Number(controller.cid),
			rating,
			role: 'member',
			isHome: homeCids.has(controller.cid),
			isMentor: controller.roles.some((role) => MENTOR_ROLES.includes(role))
		});
	}

	return { members, skipped };
}

const memberKey = (m: BookingMember) => `${m.cid}:${m.rating}:${m.role}:${m.isHome}:${m.isMentor}`;

/** What would change if `wanted` replaced `current`, by CID; nothing in any list means no change. */
export function rosterChanges(current: BookingMember[], wanted: BookingMember[]) {
	const now = new Map(current.map((m) => [m.cid, memberKey(m)]));
	const next = new Map(wanted.map((m) => [m.cid, memberKey(m)]));

	return {
		added: wanted.filter((m) => !now.has(m.cid)).map((m) => m.cid),
		changed: wanted
			.filter((m) => now.has(m.cid) && now.get(m.cid) !== next.get(m.cid))
			.map((m) => m.cid),
		removed: current.filter((m) => !next.has(m.cid)).map((m) => m.cid)
	};
}

export const hasChanges = (changes: ReturnType<typeof rosterChanges>) =>
	changes.added.length + changes.changed.length + changes.removed.length > 0;

/**
 * The T2 grants and revokes that bring the Indy Center restriction in line with the roster: every
 * rostered controller holding T2-CTR is endorsed, and nobody else. A CID granted twice keeps one.
 */
export function t2Changes(controllers: RosterController[], granted: RestrictionEndorsement[]) {
	const holders = new Set(
		controllers.filter((c) => c.endorsements.includes(T2_ENDORSEMENT)).map((c) => Number(c.cid))
	);

	const kept = new Set<number>();
	const revoke: RestrictionEndorsement[] = [];
	for (const endorsement of granted) {
		if (holders.has(endorsement.cid) && !kept.has(endorsement.cid)) kept.add(endorsement.cid);
		else revoke.push(endorsement);
	}

	return { grant: [...holders].filter((cid) => !kept.has(cid)), revoke };
}
