export enum Role {
	ADMIN = 'admin',
	CAN_MANAGE_EVENTS = 'events:manage',
	EVENTS_PROHIBIT_SIGNUP = 'events:prohibit_signup',
	FEEDBACK_REVIEWER = 'feedback:reviewer',
	BETA_TESTER = 'beta:tester'
}

export function isAdmin(roles?: string[] | null) {
	if (!roles) return false;

	return roles.includes(Role.ADMIN);
}

export function canManage(roles: string[] | null, role: Role) {
	if (!roles) return false;

	return roles.includes(role) || isAdmin(roles);
}

export function canManageEvents(roles: string[] | null) {
	return canManage(roles, Role.CAN_MANAGE_EVENTS);
}

// Access to the feedback management system: reviewing, following up, and publishing
export function canReviewFeedback(roles?: string[] | null) {
	if (!roles) return false;
	return canManage(roles, Role.FEEDBACK_REVIEWER);
}

// Early access to features still being tried out, such as bookings. Admins have it too.
export function isBetaTester(roles?: string[] | null) {
	if (!roles) return false;
	return canManage(roles, Role.BETA_TESTER);
}

export function isEventSignupProhibited(roles: string[] | null) {
	if (!roles) return false;
	return roles.includes(Role.EVENTS_PROHIBIT_SIGNUP);
}
