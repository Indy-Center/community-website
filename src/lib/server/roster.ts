import { asc, eq } from 'drizzle-orm';
import type { Roster } from '@indy-center/training-tools';
import type { AvailableCredential } from '$lib/credentials';
import {
	availableCredentialsTable,
	vatsimControllersTable
} from '$lib/db/schema/vatsimControllers';
import type { Database } from './db';
import { logger } from './logger';

/** What the refresh needs of the training app's `TRAINING` binding. */
export type TrainingRoster = { getRoster(): Promise<Roster> };

/**
 * Replaces the roster copy, each member's credentials and the available credentials with the
 * training app's answer, in one batch. If the call throws or answers with no members, changes
 * nothing and logs a warning. Returns whether the copy was replaced.
 */
export async function refreshRoster({
	training,
	db
}: {
	training: TrainingRoster;
	db: Database;
}): Promise<boolean> {
	let roster: Roster;
	try {
		roster = await training.getRoster();
	} catch (error) {
		logger.warn('Keeping the last roster copy: the training app could not be read', error);
		return false;
	}
	if (!roster.members?.length) {
		logger.warn('Keeping the last roster copy: the training app answered with no members');
		return false;
	}

	// One statement per row: D1 allows at most 100 parameters in a statement
	await db.batch([
		db.delete(vatsimControllersTable),
		db.delete(availableCredentialsTable),
		...roster.members.map((member) =>
			db.insert(vatsimControllersTable).values({
				cid: member.cid,
				firstName: member.firstName,
				lastName: member.lastName,
				namePrivacy: member.namePrivacy,
				rating: member.rating,
				facilityJoinedAt: member.facilityJoinedAt,
				roles: member.roles,
				certification: member.certification,
				endorsements: member.endorsements
			})
		),
		...roster.credentials.map(({ code, kind, name, order }) =>
			db.insert(availableCredentialsTable).values({ code, kind, name, order })
		)
	]);

	logger.info(
		`Stored ${roster.members.length} controllers and ${roster.credentials.length} available credentials from the training app`
	);
	return true;
}

/** The available credentials, in the training app's order. Empty before the first refresh. */
export function readAvailableCredentials(db: Database): Promise<AvailableCredential[]> {
	return db
		.select({
			code: availableCredentialsTable.code,
			kind: availableCredentialsTable.kind,
			name: availableCredentialsTable.name,
			order: availableCredentialsTable.order
		})
		.from(availableCredentialsTable)
		.orderBy(asc(availableCredentialsTable.order));
}

/** What one controller holds: their certification's code (or null) and endorsements' codes. */
export type HeldCredentials = { certification: string | null; endorsements: string[] };

/**
 * One CID's credentials from the roster copy, with the available credentials to name them.
 * `held` is null when the CID isn't on the controller roster.
 */
export async function readMemberCredentials(
	db: Database,
	cid: string
): Promise<{ held: HeldCredentials | null; credentials: AvailableCredential[] }> {
	const [held, credentials] = await Promise.all([
		db.query.vatsimControllersTable.findFirst({
			where: eq(vatsimControllersTable.cid, cid),
			columns: { certification: true, endorsements: true }
		}),
		readAvailableCredentials(db)
	]);
	return { held: held ?? null, credentials };
}
