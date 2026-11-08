import type { Database } from '$lib/server/db';
import { syncMemberships } from '$lib/server/membership';
import { refreshRoster, type TrainingRoster } from '$lib/server/roster';
import { fetchFacilityInfo } from '$lib/server/vatsim/vatusaDataClient';
import type { VatusaFacilityInfo } from '$lib/types/vatusa';
import { staffPocsTable } from '$lib/db/schema/staff';
import { STAFF_POSITIONS } from '$lib/config/staff';
import { logger } from '$lib/server/logger';

/**
 * The five-minute job: refreshes the roster copy from the training app and, after a good
 * refresh, syncs memberships from it. The staff points of contact come from VATUSA on their own,
 * whatever the training app answers.
 */
export async function runProcessRoster({
	training,
	db
}: {
	training: TrainingRoster;
	db: Database;
}) {
	await Promise.all([refreshRosterAndMemberships(training, db), syncStaffPocs(db)]);
}

async function refreshRosterAndMemberships(training: TrainingRoster, db: Database) {
	if (await refreshRoster({ training, db })) {
		await syncMemberships(db);
	} else {
		logger.warn('Skipping the membership sync: the roster copy was not refreshed');
	}
}

async function syncStaffPocs(db: Database) {
	let info: VatusaFacilityInfo;
	try {
		info = await fetchFacilityInfo();
	} catch (error) {
		logger.warn('Keeping the staff points of contact: VATUSA could not be read', error);
		return;
	}
	const pocs = STAFF_POSITIONS.map((position) => ({
		position: position.key,
		cid: String(info[position.key.toLowerCase() as keyof VatusaFacilityInfo] ?? 0)
	})).filter((poc) => poc.cid !== '0');
	await db.batch([
		db.delete(staffPocsTable),
		...pocs.map((poc) => db.insert(staffPocsTable).values(poc))
	]);
	logger.info(`Synced ${pocs.length} staff points of contact`);
}
