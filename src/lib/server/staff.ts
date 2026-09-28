import { FACILITY_ID } from '$lib/config';
import {
	STAFF_POSITIONS,
	STAFF_TEAMS,
	isManualOnlyPosition,
	type StaffTeamSection
} from '$lib/config/staff';
import type { StaffBadgeKey } from '$lib/config/staffBadges';
import type { Database } from '$lib/server/db';
import type { VatusaRosterMember } from '$lib/types/vatusa';

// Who holds each staff position and team section. Shared by the staff page, the roster,
// and profiles so they always agree.

type RosterEntry = { cid: string; data: VatusaRosterMember };
type Assignment = { position: string; cid: string };
type TeamRow = { team: string; cid: string; excluded: boolean };

// CIDs holding a role according to VATUSA facility roles
export function getVatusaHolders(roster: RosterEntry[], role: string) {
	return roster
		.filter((member) =>
			member.data.roles?.some((r) => r.facility === FACILITY_ID && r.role === role)
		)
		.map((member) => member.cid);
}

// Manual assignments replace the VATUSA role holders for a position
export function getPositionHolders(
	position: string,
	roster: RosterEntry[],
	assignments: Assignment[]
) {
	const manual = assignments.filter((a) => a.position === position).map((a) => a.cid);
	if (isManualOnlyPosition(position) || manual.length > 0) return manual;
	return getVatusaHolders(roster, position);
}

// A team section is its VATUSA role holders plus manual additions, minus manual
// removals and the team's leads
export function getSectionMembers(
	section: StaffTeamSection,
	leads: string[],
	roster: RosterEntry[],
	teamRows: TeamRow[]
) {
	// Manual membership changes are stored under the section key
	const rows = teamRows.filter((row) => row.team === section.key);
	const cids = new Set([
		...(section.vatusaRole ? getVatusaHolders(roster, section.vatusaRole) : []),
		...rows.filter((row) => !row.excluded).map((row) => row.cid)
	]);
	for (const row of rows) if (row.excluded) cids.delete(row.cid);
	for (const cid of leads) cids.delete(cid);
	return [...cids];
}

// Staff badge keys (position keys and team section keys) for every staff member, by CID
export async function getStaffBadges(db: Database, roster?: RosterEntry[]) {
	const [rosterEntries, assignments, teamRows] = await Promise.all([
		roster ?? db.query.vatsimControllersTable.findMany(),
		db.query.staffAssignmentsTable.findMany(),
		db.query.staffTeamMembersTable.findMany()
	]);

	const badges = new Map<string, StaffBadgeKey[]>();
	const add = (cid: string, key: StaffBadgeKey) =>
		badges.set(cid, [...(badges.get(cid) ?? []), key]);

	for (const position of STAFF_POSITIONS) {
		for (const cid of getPositionHolders(position.key, rosterEntries, assignments)) {
			add(cid, position.key as StaffBadgeKey);
		}
	}

	for (const team of STAFF_TEAMS) {
		const leads = getPositionHolders(team.lead, rosterEntries, assignments);
		for (const section of team.sections) {
			for (const cid of getSectionMembers(section, leads, rosterEntries, teamRows)) {
				add(cid, section.key as StaffBadgeKey);
			}
		}
	}

	return badges;
}
