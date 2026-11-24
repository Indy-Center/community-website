import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import type { Database } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { fetchRoster } from '$lib/server/vatsim/vatusaDataClient';
import type { BookingsClient } from '$lib/types/bookings';
import { hasChanges, rosterChanges, t2Changes, toBookingMembers } from '$lib/utils/bookingRoster';

let warnedNoRestriction = false;

/**
 * Brings the booking system in line with the roster copy, after each good roster refresh:
 *
 * - **Roster.** Every rostered controller, home and visiting, with their rating, home flag and
 *   mentor flag. Only when something differs is the whole roster sent; the booking system removes
 *   anyone left out.
 * - **T2.** Every rostered controller holding T2-CTR is endorsed on the Indy Center restriction
 *   (`restrictionId`, the VATSIM_BOOKING_T2_RESTRICTION_ID setting), and anyone else's endorsement
 *   is revoked. Off while the setting is missing.
 *
 * Both compare what the booking system has with what it should have, so a failed run is put right
 * by the next. Failures are logged, never thrown: this must not hold up the membership sync.
 */
export async function syncBookingSystem(
	client: BookingsClient | undefined,
	db: Database,
	restrictionId: string | undefined
) {
	if (!client) return;
	if (!restrictionId && !warnedNoRestriction) {
		warnedNoRestriction = true;
		logger.warn('VATSIM_BOOKING_T2_RESTRICTION_ID is not set; T2 sync is off');
	}

	// Each read may fail on its own; whatever arrives is used
	const [controllers, home, current, granted] = await Promise.all([
		db
			.select({
				cid: vatsimControllersTable.cid,
				rating: vatsimControllersTable.rating,
				roles: vatsimControllersTable.roles,
				endorsements: vatsimControllersTable.endorsements
			})
			.from(vatsimControllersTable),
		fetchRoster('home').then(
			(data) => (Array.isArray(data) ? new Set(data.map((m) => String(m.cid))) : null),
			(error) => (logger.warn('Could not read the VATUSA home roster', error), null)
		),
		client
			.listMembers()
			.catch((error) => (logger.error('Could not read the booking system roster', error), null)),
		restrictionId
			? client
					.listEndorsements(restrictionId)
					.catch(
						(error) => (
							logger.error(
								`Could not read the T2 endorsements on restriction ${restrictionId}`,
								error
							),
							null
						)
					)
			: null
	]);

	if (controllers.length === 0) {
		logger.warn('Not syncing the booking system: the roster copy is empty');
		return;
	}

	// Roster first, so a new controller is on the booking system's roster before being endorsed
	if (home && current) {
		await pushRoster(client, controllers, home, current);
	} else if (!home) {
		logger.warn('Not syncing the booking system roster: VATUSA home roster unavailable');
	}

	if (restrictionId && granted) await pushT2(client, restrictionId, controllers, granted);
}

async function pushRoster(
	client: BookingsClient,
	controllers: Parameters<typeof toBookingMembers>[0],
	home: Set<string>,
	current: Awaited<ReturnType<BookingsClient['listMembers']>>
) {
	const { members, skipped } = toBookingMembers(controllers, home);
	if (skipped.length > 0) {
		logger.warn(`Leaving ${skipped.length} controllers off the booking system roster: no rating`, {
			cids: skipped
		});
	}

	const changes = rosterChanges(current, members);
	if (!hasChanges(changes)) return;

	try {
		await client.replaceMembers(members);
		logger.info(
			`Updated the booking system roster: ${changes.added.length} added, ${changes.changed.length} changed, ${changes.removed.length} removed`,
			changes
		);
	} catch (error) {
		logger.error('Could not update the booking system roster', error);
	}
}

async function pushT2(
	client: BookingsClient,
	restrictionId: string,
	controllers: Parameters<typeof t2Changes>[0],
	granted: Parameters<typeof t2Changes>[1]
) {
	const { grant, revoke } = t2Changes(controllers, granted);

	// One at a time, so one failure doesn't stop the rest
	for (const cid of grant) {
		try {
			await client.grantEndorsement(restrictionId, cid);
			logger.info(`Granted T2 to ${cid}`);
		} catch (error) {
			logger.error(`Could not grant T2 to ${cid}`, error);
		}
	}
	for (const endorsement of revoke) {
		try {
			await client.revokeEndorsement(restrictionId, endorsement.id);
			logger.info(`Revoked T2 from ${endorsement.cid}`);
		} catch (error) {
			logger.error(`Could not revoke T2 from ${endorsement.cid}`, error);
		}
	}
}
