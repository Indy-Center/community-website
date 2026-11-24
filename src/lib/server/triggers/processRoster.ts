import { syncBookingSystem } from '$lib/server/bookingRoster';
import type { Database } from '$lib/server/db';
import type { BookingsClient } from '$lib/types/bookings';
import { syncMemberships } from '$lib/server/membership';
import { refreshRoster, type TrainingRoster } from '$lib/server/roster';
import { fetchFacilityInfo } from '$lib/server/vatsim/vatusaDataClient';
import type { VatusaFacilityInfo } from '$lib/types/vatusa';
import { staffPocsTable } from '$lib/db/schema/staff';
import { STAFF_POSITIONS } from '$lib/config/staff';
import { logger } from '$lib/server/logger';

/**
 * The five-minute job: refreshes the roster copy from the training app and, after a good
 * refresh, syncs memberships and the booking system (roster and T2) from it. The staff points of
 * contact come from VATUSA on their own, whatever the training app answers.
 */
export async function runProcessRoster({
	training,
	db,
	bookings,
	t2RestrictionId
}: {
	training: TrainingRoster;
	db: Database;
	bookings?: BookingsClient;
	t2RestrictionId?: string;
}) {
	await Promise.all([refreshAndSync(training, db, bookings, t2RestrictionId), syncStaffPocs(db)]);
}

async function refreshAndSync(
	training: TrainingRoster,
	db: Database,
	bookings: BookingsClient | undefined,
	t2RestrictionId: string | undefined
) {
	if (!(await refreshRoster({ training, db }))) {
		logger.warn('Skipping the membership and booking syncs: the roster copy was not refreshed');
		return;
	}

	// Independent, so a booking system failure never holds up memberships; failures still fail the run
	const [memberships] = await Promise.allSettled([
		syncMemberships(db),
		syncBookingSystem(bookings, db, t2RestrictionId)
	]);
	if (memberships.status === 'rejected') throw memberships.reason;
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
