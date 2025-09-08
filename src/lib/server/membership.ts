import type { User } from '$lib/db/schema/users';
import { and, eq, isNotNull, notInArray } from 'drizzle-orm';
import type { Database } from './db';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
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
	console.log(
		`Syncing membership for user ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	// Check to see if they're on the roster. This may not be 100% accurate if the roster
	// hasn't been ingested recently.
	const controller = await db.query.vatsimControllersTable.findFirst({
		where: eq(vatsimControllersTable.cid, user.cid)
	});

	if (controller && user.membership !== 'controller') {
		console.log(`User ${user.id} is now a controller.`);
		// Update Their Status
		await db.update(usersTable).set({ membership: 'controller' }).where(eq(usersTable.id, user.id));

		// Do new controller processing
		await processNewController(db, user);
	} else if (!controller && user.membership === 'controller') {
		console.log(`User ${user.id} is no longer a controller.`);
		await db.update(usersTable).set({ membership: 'community' }).where(eq(usersTable.id, user.id));
	}

	console.log(`Membership sync for user ${user.id} complete.`);
}

async function processNewController(db: Database, user: User) {
	console.log(
		`Processing new controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	// Grant Certificates
	await grantInitialCertifications(db, user);

	await grantOperatingInitials(db, user);

	console.log(
		`Processing new controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName}) complete.`
	);
}

async function grantInitialCertifications(db: Database, user: User) {
	console.log(
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
		console.log(
			`Granted ${result.length} initial certificates for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	} else {
		console.log(
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

	console.log(
		`Granting operating initials for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	const combinations = [];
	for (let i = 0; i < Math.min(user.firstName.length, 4); i++) {
		for (let j = 0; j < Math.min(user.lastName.length, 4); j++) {
			const combo = user.firstName.charAt(i).toUpperCase() + user.lastName.charAt(j).toUpperCase();
			// Filter out any offensive combinations like SS
			if (!BANNED_INITIAL_COMBINATIONS.includes(combo)) {
				combinations.push(combo);
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
		console.log(
			`Granted operating initials for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	} else {
		await db.update(usersTable).set({ operatingInitials: null }).where(eq(usersTable.id, user.id));
		console.log(
			`No operating initials found for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	}
}

export async function syncMemberships(db: Database) {
	console.log('Starting bulk membership sync...');

	// Demote controllers not in vatsim controllers table
	const demotedResult = await db
		.update(usersTable)
		.set({ membership: 'community', operatingInitials: null })
		.where(
			and(
				eq(usersTable.membership, 'controller'),
				notInArray(
					usersTable.cid,
					db.select({ cid: vatsimControllersTable.cid }).from(vatsimControllersTable)
				)
			)
		)
		.returning({ id: usersTable.id, cid: usersTable.cid });

	console.log(`Demoted ${demotedResult.length} users from controller to community`);

	// Get and promote community members who should be controllers
	const usersToPromote = await db
		.select({ id: usersTable.id, cid: usersTable.cid })
		.from(usersTable)
		.innerJoin(vatsimControllersTable, eq(usersTable.cid, vatsimControllersTable.cid))
		.where(eq(usersTable.membership, 'community'));

	for (const user of usersToPromote) {
		console.log(`Promoting user ${user.id} (${user.cid}) to controller`);

		const [updatedUser] = await db
			.update(usersTable)
			.set({ membership: 'controller' })
			.where(eq(usersTable.id, user.id))
			.returning();

		await processNewController(db, updatedUser);
	}

	console.log(`Promoted ${usersToPromote.length} users from community to controller`);
	console.log('Bulk membership sync complete');
}
