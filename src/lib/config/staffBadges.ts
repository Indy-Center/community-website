// Badges shown next to staff on the roster and profiles, in display order. Keys are the
// staff position keys and team section keys from $lib/config/staff.
export const STAFF_BADGES = [
	{ key: 'ATM', label: 'ATM', title: 'Air Traffic Manager', group: 'senior' },
	{ key: 'DATM', label: 'DATM', title: 'Deputy Air Traffic Manager', group: 'senior' },
	{ key: 'TA', label: 'TA', title: 'Training Administrator', group: 'senior' },
	{ key: 'EC', label: 'EC', title: 'Events Coordinator', group: 'senior' },
	{ key: 'FE', label: 'FE', title: 'Facility Engineer', group: 'senior' },
	{ key: 'WM', label: 'WM', title: 'Webmaster', group: 'senior' },
	{ key: 'instructors', label: 'INS', title: 'Instructor', group: 'training' },
	{ key: 'mentors', label: 'MENTOR', title: 'Mentor', group: 'training' },
	{ key: 'fwg', label: 'FWG', title: 'Facility Working Group', group: 'team' },
	{ key: 'tech', label: 'TECH', title: 'Tech Team', group: 'team' },
	{ key: 'events', label: 'EVENTS', title: 'Events Team', group: 'team' }
] as const;

export type StaffBadgeKey = (typeof STAFF_BADGES)[number]['key'];
