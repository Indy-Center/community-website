export type StaffPosition = {
	key: string;
	title: string;
};

export type StaffTeamSection = {
	// Key that manual membership changes are stored under
	key: string;
	// Heading shown above the section; omitted for single-section teams
	name?: string;
	// VATUSA facility role whose holders are members of the section
	vatusaRole?: string;
};

export type StaffTeam = {
	key: string;
	name: string;
	// Staff position that leads the team
	lead: string;
	sections: StaffTeamSection[];
};

// Senior staff positions, in display order. Keys match VATUSA facility role codes.
export const STAFF_POSITIONS: StaffPosition[] = [
	{ key: 'ATM', title: 'Air Traffic Manager' },
	{ key: 'DATM', title: 'Deputy Air Traffic Manager' },
	{ key: 'TA', title: 'Training Administrator' },
	{ key: 'EC', title: 'Events Coordinator' },
	{ key: 'FE', title: 'Facility Engineer' },
	{ key: 'WM', title: 'Webmaster' }
];

export const STAFF_TEAMS: StaffTeam[] = [
	{
		key: 'training',
		name: 'Training Team',
		lead: 'TA',
		sections: [
			{ key: 'instructors', name: 'Instructors', vatusaRole: 'INS' },
			{ key: 'mentors', name: 'Mentors', vatusaRole: 'MTR' }
		]
	},
	{
		key: 'events',
		name: 'Events Team',
		lead: 'EC',
		sections: [{ key: 'events', vatusaRole: 'EC' }]
	},
	{
		key: 'fwg',
		name: 'Facility Working Group',
		lead: 'FE',
		sections: [{ key: 'fwg', vatusaRole: 'FE' }]
	},
	{
		key: 'tech',
		name: 'Tech Team',
		lead: 'WM',
		sections: [{ key: 'tech', vatusaRole: 'WM' }]
	}
];

export const STAFF_TEAM_SECTIONS = STAFF_TEAMS.flatMap((team) => team.sections);

// When a team is built from a position's VATUSA role, that role can't identify the
// lead, so the position is only ever filled manually.
export function isManualOnlyPosition(position: string) {
	return STAFF_TEAM_SECTIONS.some((section) => section.vatusaRole === position);
}
