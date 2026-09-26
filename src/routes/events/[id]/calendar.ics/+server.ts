import { eventsTable } from '$lib/db/schema/events';
import { canManageEvents } from '$lib/utils/permissions';
import { buildIcsFile } from '$lib/utils/calendar';
import { error, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const GET = async ({ locals, params, url }: RequestEvent) => {
	const event = await locals.db.query.eventsTable.findFirst({
		where: eq(eventsTable.id, params.id!)
	});

	if (!event || (!event.isPublished && !canManageEvents(locals.roles))) {
		error(404, 'Event not found');
	}

	const eventUrl = `${url.origin}/events/${event.id}`;
	const ics = buildIcsFile(event, eventUrl, url.hostname);

	return new Response(ics, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': `attachment; filename="event-${event.id}.ics"`
		}
	});
};
