import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import type { Database } from '$lib/server/db';
import logger from '$lib/server/logger';
import { syncMemberships } from '$lib/server/membership';
import { fetchRoster } from '$lib/server/vatsim/vatusaDataClient';
import type { VatusaRosterMember } from '$lib/types/vatusa';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { eq, inArray } from 'drizzle-orm';
import { usersTable } from '$lib/db/schema/users';
import { addMonths } from 'date-fns';

const ARTCC_ID = 'ZID';

export const GET: RequestHandler = async ({ locals }) => {
	const roster = await fetchRoster(ARTCC_ID);

	await processRoster(locals.db, roster);

	await renewCertifications(locals.db);

	return json({ message: 'Roster processed' });
};

async function processRoster(db: Database, roster: VatusaRosterMember[]) {
	// Syncs our vatsim_controllers table from VATUSA.
	await syncVatsimControllers(db, roster);

	await syncMemberships(db);
}

async function syncVatsimControllers(db: Database, roster: VatusaRosterMember[]) {
	logger.info(`Syncing ${roster.length} VATSIM controllers`);
	const rosterValues = roster.map((member) => ({
		data: member,
		cid: String(member.cid)
	}));

	await db.batch([
		db.delete(vatsimControllersTable),
		...rosterValues.map((value) => db.insert(vatsimControllersTable).values(value))
	]);

	logger.info(`Synced ${rosterValues.length} VATSIM controllers`);
	return rosterValues.length;
}

async function renewCertifications(db: Database) {
	logger.info(`Renewing certifications`);
	const result = await db
		.update(userCertificationsTable)
		.set({
			expiresAt: addMonths(new Date(), 6)
		})
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
