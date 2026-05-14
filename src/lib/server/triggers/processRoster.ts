import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import type { Database } from '$lib/server/db';
import { syncMemberships } from '$lib/server/membership';
import { fetchRoster } from '$lib/server/vatsim/vatusaDataClient';
import type { VatusaRosterMember } from '$lib/types/vatusa';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { eq, inArray } from 'drizzle-orm';
import { usersTable } from '$lib/db/schema/users';
import { addMonths } from 'date-fns';
import { logger } from '$lib/server/logger';

export async function runProcessRoster(db: Database) {
	const roster = await fetchRoster();
	await syncVatsimControllers(db, roster);
	await syncMemberships(db);
	await renewCertifications(db);
}

async function syncVatsimControllers(db: Database, roster: VatusaRosterMember[]) {
	logger.info(`Syncing ${roster.length} VATSIM controllers`);
	const rosterValues = roster.map((member) => ({ data: member, cid: String(member.cid) }));
	await db.batch([
		db.delete(vatsimControllersTable),
		...rosterValues.map((value) => db.insert(vatsimControllersTable).values(value))
	]);
	logger.info(`Synced ${rosterValues.length} VATSIM controllers`);
}

async function renewCertifications(db: Database) {
	logger.info(`Renewing certifications`);
	const result = await db
		.update(userCertificationsTable)
		.set({ expiresAt: addMonths(new Date(), 6) })
		.where(
			inArray(
				userCertificationsTable.userId,
				db
					.select({ id: usersTable.id })
					.from(usersTable)
					.where(eq(usersTable.membership, 'controller'))
			)
		)
		.returning();
	logger.info(`Renewed ${result.length} certifications`);
}
