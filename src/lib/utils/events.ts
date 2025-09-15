import { isAfter, isBefore, subHours } from 'date-fns';
import type { Event } from '$lib/db/schema/events';

export function isSignUpClosed(event?: Event) {
	if (!event) return true;

	const closeTime = subHours(event.startTime, 24);

	return (
		// Sign ups close 24 hours before the event start time
		isAfter(new Date(), closeTime) &&
		// Only open rosters allow sign up
		event.rosterType === 'open' &&
		// The roster must be released
		event.isRosterPublished
	);
}
