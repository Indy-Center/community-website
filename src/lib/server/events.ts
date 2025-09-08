import type { Database } from './db';
import { eventsTable } from '$lib/db/schema';
import { ulid } from 'ulid';
import { UTCDate } from '@date-fns/utc';

export async function listEvents(db: Database) {
	const events = await db.query.eventsTable.findMany();

	return events;
}

export async function createEvent(
	db: Database,
	eventData: {
		name: string;
		description: string;
		type: string;
		rosterType: string;
		bannerUrl: string;
		startTime: string;
		endTime: string;
	}
) {
	const [event] = await db
		.insert(eventsTable)
		.values({
			id: ulid(),
			name: eventData.name,
			description: eventData.description,
			type: eventData.type,
			rosterType: eventData.rosterType as 'open' | 'assigned' | 'none',
			bannerUrl: eventData.bannerUrl,
			startTime: new UTCDate(eventData.startTime + 'Z'),
			endTime: new UTCDate(eventData.endTime + 'Z'),
			isPublished: true
		})
		.returning();

	return event;
}
