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

// Helper functions. An event's type comes from the database as a plain string, so these
// take one; a string that isn't an event type finds no config.
export function getEventTypeConfig(key: string): EventTypeConfig | undefined {
	return EVENT_TYPES.find((type) => type.key === key);
}

export function getRosterTypeConfig(key: RosterType): EventRosterTypeConfig | undefined {
	return EVENT_ROSTER_TYPES.find((type) => type.key === key);
}

export function supportsRosters(eventType: string): boolean {
	const config = getEventTypeConfig(eventType);
	return config ? config.allowedRosterTypes.length > 1 : false;
}

export function isRosterTypeAllowed(eventType: EventType, rosterType: RosterType): boolean {
	const config = getEventTypeConfig(eventType);
	return config ? config.allowedRosterTypes.includes(rosterType) : false;
}

// Events longer than this get a warning, since a start or end time is more likely mistyped
export const LONG_EVENT_HOURS = 18;

/** The event's length in whole hours, rounded down, when it runs longer than LONG_EVENT_HOURS. */
export function longEventHours(start: Date | null | undefined, end: Date | null | undefined) {
	if (!start || !end) return null;
	const hours = (end.getTime() - start.getTime()) / 3600000;
	return hours > LONG_EVENT_HOURS ? Math.floor(hours) : null;
}
