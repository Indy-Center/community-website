export type RosterType = 'none' | 'open' | 'assigned';

export type EventType = 'support' | 'staffing' | 'home' | 'community' | 'group_flight' | 'other';

export interface EventTypeConfig {
	key: EventType;
	label: string;
	allowedRosterTypes: RosterType[];
}

export interface EventRosterTypeConfig {
	key: RosterType;
	label: string;
}

export const EVENT_ROSTER_TYPES: EventRosterTypeConfig[] = [
	{
		key: 'none',
		label: 'No Roster'
	},
	{
		key: 'open',
		label: 'Open Roster'
	},
	{
		key: 'assigned',
		label: 'Assigned Roster'
	}
];

export const EVENT_TYPES: EventTypeConfig[] = [
	{
		key: 'support',
		label: 'Support',
		allowedRosterTypes: ['none', 'open', 'assigned']
	},
	{
		key: 'staffing',
		label: 'Staffing',
		allowedRosterTypes: ['none', 'open', 'assigned']
	},
	{
		key: 'home',
		label: 'Home',
		allowedRosterTypes: ['none', 'open', 'assigned']
	},
	{
		key: 'community',
		label: 'Community',
		allowedRosterTypes: ['none']
	},
	{
		key: 'group_flight',
		label: 'Group Flight',
		allowedRosterTypes: ['none']
	},
	{
		key: 'other',
		label: 'Other',
		allowedRosterTypes: ['none', 'open', 'assigned']
	}
];

// Helper functions
export function getEventTypeConfig(key: EventType): EventTypeConfig | undefined {
	return EVENT_TYPES.find(type => type.key === key);
}

export function getRosterTypeConfig(key: RosterType): EventRosterTypeConfig | undefined {
	return EVENT_ROSTER_TYPES.find(type => type.key === key);
}

export function supportsRosters(eventType: EventType): boolean {
	const config = getEventTypeConfig(eventType);
	return config ? config.allowedRosterTypes.length > 1 : false;
}

export function isRosterTypeAllowed(eventType: EventType, rosterType: RosterType): boolean {
	const config = getEventTypeConfig(eventType);
	return config ? config.allowedRosterTypes.includes(rosterType) : false;
}
