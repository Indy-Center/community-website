import { and, eq, isNotNull, lte } from 'drizzle-orm';
import type { LarryBinding } from '@indy-center/indy-larry-worker';
import { eventBriefingsTable, eventsTable } from '$lib/db/schema/events';
import type { Database } from '$lib/server/db';
import { logger } from '$lib/server/logger';

// An event's Discord role (made when its briefing is sent) only matters until the event is over.
// This file deletes it: when the event is deleted, or by the cron once it ends. It imports nothing
// Svelte-only, since the cron's bundle (src/worker.ts) is built outside SvelteKit.

/** Deletes one role for everyone who holds it. A role Discord no longer has counts as deleted. */
export async function deleteRole(larry: LarryBinding, roleId: string) {
	const { deleted } = await larry.deleteRoles({ ids: [roleId] });
	const failed = deleted.find((deletion) => deletion.error);
	if (failed) throw new Error(failed.error);
}

/**
 * The cron's job: deletes the role of every event that has ended, and forgets the role on its
 * briefing so it isn't deleted again. The briefing's post stays. A role that can't be deleted is
 * logged and tried again next run; one failing doesn't stop the rest.
 */
export async function removeEndedEventRoles(
	larry: LarryBinding | undefined,
	db: Database,
	now: Date
) {
	if (!larry) return;

	const ended = await db
		.select({ eventId: eventBriefingsTable.eventId, roleId: eventBriefingsTable.roleId })
		.from(eventBriefingsTable)
		.innerJoin(eventsTable, eq(eventsTable.id, eventBriefingsTable.eventId))
		.where(and(isNotNull(eventBriefingsTable.roleId), lte(eventsTable.endTime, now)));

	for (const { eventId, roleId } of ended) {
		try {
			await deleteRole(larry, roleId!);
			await db
				.update(eventBriefingsTable)
				.set({ roleId: null, updatedAt: now })
				.where(eq(eventBriefingsTable.eventId, eventId));
			logger.info(`Deleted the Discord role of event ${eventId}, which has ended`);
		} catch (error) {
			logger.error(`Couldn't delete the Discord role of ended event ${eventId}`, error);
		}
	}
}
