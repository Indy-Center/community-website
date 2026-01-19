export enum Role {
	ADMIN = 'admin',
	CAN_MANAGE_EVENTS = 'events:manage',
	EVENTS_PROHIBIT_SIGNUP = 'events:prohibit_signup'
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

export function isEventSignupProhibited(roles: string[] | null) {
	if (!roles) return false;
	return roles.includes(Role.EVENTS_PROHIBIT_SIGNUP);
}
