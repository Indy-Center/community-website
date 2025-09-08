import type { User } from '$lib/db/schema/users';
import { eq, isNotNull } from 'drizzle-orm';
import type { Database } from './db';
import { vatsimControllersTable, type VatsimController } from '$lib/db/schema/vatsimControllers';
import logger from './logger';
import { usersTable } from '$lib/db/schema/users';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { addMonths } from 'date-fns';

/**
 * Looks at the user's information to determine the status of their membership.
 *
 * @param db handle to the D1 Database
 * @param user the user to process membership sync on
 */
export async function syncUserMembership(db: Database, user: User) {
	logger.info(
		`Syncing membership for user ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	// Check to see if they're on the roster. This may not be 100% accurate if the roster
	// hasn't been ingested recently.
	const controller = await db.query.vatsimControllersTable.findFirst({
		where: eq(vatsimControllersTable.cid, user.cid)
	});

	if (controller && user.membership !== 'controller') {
		logger.info(`User ${user.id} is now a controller.`);
		// Update Their Status
		await db.update(usersTable).set({ membership: 'controller' }).where(eq(usersTable.id, user.id));

		// Do new controller processing
		await processNewController(db, user);
	} else if (!controller && user.membership === 'controller') {
		logger.info(`User ${user.id} is no longer a controller.`);
		await db.update(usersTable).set({ membership: 'community' }).where(eq(usersTable.id, user.id));
	}

	logger.info(`Membership sync for user ${user.id} complete.`);
}

async function processNewController(db: Database, user: User) {
	logger.info(
		`Processing new controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	// Grant Certificates
	await grantInitialCertifications(db, user);

	await grantOperatingInitials(db, user);

	logger.info(
		`Processing new controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName}) complete.`
	);
}

async function grantInitialCertifications(db: Database, user: User) {
	logger.info(
		`Granting initial certificates for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	const certifications = determineCertificationsFromRating(user.data.vatsim.rating.short);

	if (certifications.length > 0) {
		const result = await db
			.insert(userCertificationsTable)
			.values(
				certifications.map((certification) => ({
					userId: user.id,
					certification: certification,
					createdAt: new Date(),
					expiresAt: addMonths(new Date(), 6)
				}))
			)
			.onConflictDoNothing()
			.returning();
		logger.info(
			`Granted ${result.length} initial certificates for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	} else {
		logger.info(
			`No initial certificates found for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	}
}

/**
 * Initial certifications are determined based on your VATSIM Rating.
 *
 * @param rating
 * @returns
 */
function determineCertificationsFromRating(rating: string) {
	switch (rating) {
		case 'S1':
			return ['GND'];
		case 'S2':
			return ['TWR'];
		case 'S3':
			return ['APR'];
		case 'C1':
		case 'C2':
		case 'C3':
		case 'I1':
		case 'I2':
		case 'I3':
			return ['CTR'];
		default:
			return [];
	}
}

/**
 * Operating Initials are calculated using the following process:
 * - First Initial of First Name + First Initial of Last Name
 * - If there is a conflict, Second Initial of First Name + Second Initial of Last Name
 * - If there is a conflict, Third Initial of First Name + Third Initial of Last Name
 * - and so on. If fail, set to null.
 */
async function grantOperatingInitials(db: Database, user: User) {
	const BANNED_INITIAL_COMBINATIONS = ['SS'];

	logger.info(
		`Granting operating initials for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	const combinations = [];
	for (let i = 0; i < Math.min(user.firstName.length, 4); i++) {
		for (let j = 0; j < Math.min(user.lastName.length, 4); j++) {
			// Filter out any offensive combinations like SS
			if (
				!BANNED_INITIAL_COMBINATIONS.includes(user.firstName.charAt(i) + user.lastName.charAt(j))
			) {
				combinations.push(user.firstName.charAt(i) + user.lastName.charAt(j));
			}
		}
	}

	const existingInitials: { operatingInitials: string }[] = await db.query.usersTable.findMany({
		where: isNotNull(usersTable.operatingInitials),
		columns: {
			operatingInitials: true
		}
	});

	const initials = combinations.find(
		(combination) => !existingInitials.some((initial) => initial.operatingInitials === combination)
	);

	if (initials) {
		await db
			.update(usersTable)
			.set({ operatingInitials: initials })
			.where(eq(usersTable.id, user.id));
		logger.info(
			`Granted operating initials for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	} else {
		await db.update(usersTable).set({ operatingInitials: null }).where(eq(usersTable.id, user.id));
		logger.info(
			`No operating initials found for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	}
}
