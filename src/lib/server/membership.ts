import type { User } from '$lib/db/schema/users';
import { and, eq, inArray, isNotNull, not, notInArray } from 'drizzle-orm';
import type { Database } from './db';
import { vatsimControllersTable, type VatsimController } from '$lib/db/schema/vatsimControllers';
import { usersTable } from '$lib/db/schema/users';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { addMonths } from 'date-fns';
import { userRolesTable } from '$lib/db/schema/roles';
import { Role } from '$lib/utils/permissions';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';

const BANNED_INITIAL_COMBINATIONS = ['SS'];

const ARTCC_ID = 'ZID';

// These roles are given based off VATUSA membership and can be removed
// when the user falls off the roster.
const VATUSA_ROLES_TO_MEMBERSHIP_ROLES = {
	EC: [Role.CAN_MANAGE_EVENTS],
	WM: [Role.ADMIN],
	ATM: [Role.ADMIN],
	DATM: [Role.ADMIN],
	TA: [Role.ADMIN]
};

const VATUSA_MANAGED_MEMBERSHIP_ROLES = Object.values(VATUSA_ROLES_TO_MEMBERSHIP_ROLES).flat();

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
		await processNewController(db, user, controller);
	} else if (!controller && user.membership === 'controller') {
		console.log(`User ${user.id} is no longer a controller.`);
		// Do leaving controller processing
		await processLeavingController(db, user);
	} else if (controller && user.membership === 'controller') {
		console.log(`User ${user.id} is already a controller. Processing role updates.`);
		await grantRoles(db, user, controller);
	}

	console.log(`Membership sync for user ${user.id} complete.`);
}

async function processLeavingController(db: Database, user: User) {
	console.log(
		`Processing leaving controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	await grantRoles(db, user, null);

	await db.update(usersTable).set({ membership: 'community' }).where(eq(usersTable.id, user.id));
}

async function processNewController(db: Database, user: User, controller: VatsimController) {
	console.log(
		`Processing new controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	// Grant Certificates
	await grantInitialCertificationsAndEndorsements(db, user);

	await grantOperatingInitials(db, user);

	await grantRoles(db, user, controller);

	console.log(
		`Processing new controller ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName}) complete.`
	);
}

async function grantInitialCertificationsAndEndorsements(db: Database, user: User) {
	console.log(
		`Granting initial certificates for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);

	const { certifications, endorsements } = determineCertificationsAndEndorsementsFromRating(
		user.data.vatsim.rating.short
	);

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
	}

	if (endorsements.length > 0) {
		const result = await db
			.insert(userEndorsementsTable)
			.values(
				endorsements.map((endorsement) => ({
					userId: user.id,
					endorsement: endorsement,
					createdAt: new Date(),
					updatedAt: new Date(),
					expiresAt: addMonths(new Date(), 6)
				}))
			)
			.onConflictDoNothing()
			.returning();
		console.log(
			`Granted ${result.length} initial endorsements for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	}
}

/**
 * Initial certifications and some endorsements are determined based on your VATSIM Rating.
 *
 * @param rating
 * @returns
 */
function determineCertificationsAndEndorsementsFromRating(rating: string) {
	switch (rating) {
		case 'S1':
			return { certifications: ['S-GND'] };
		case 'S2':
			return { certifications: ['TWR'], endorsements: [] };
		case 'S3':
		case 'C1':
		case 'C2':
		case 'C3':
		case 'I1':
		case 'I2':
		case 'I3':
			return { certifications: ['APP'], endorsements: [] };
		default:
			return { certifications: [], endorsements: [] };
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
	// Check if user already has operating initials
	if (user.operatingInitials) {
		console.log(
			`User ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName}) already has operating initials: ${user.operatingInitials}`
		);
		return;
	}

	const existingInitials = (
		await db.query.usersTable.findMany({
			where: isNotNull(usersTable.operatingInitials),
			columns: {
				operatingInitials: true
			}
		})
	)
		.map((user) => user.operatingInitials!)
		.concat(BANNED_INITIAL_COMBINATIONS);

	const combinations = generateOperatingInitialCombinations(user.firstName, user.lastName);
	const initials = combinations.find((combination) => !existingInitials.includes(combination));

	if (initials) {
		await db
			.update(usersTable)
			.set({ operatingInitials: initials })
			.where(eq(usersTable.id, user.id));
		console.log(
			`Granted operating initials ${initials} for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	} else {
		await db.update(usersTable).set({ operatingInitials: null }).where(eq(usersTable.id, user.id));
		console.log(
			`No operating initials found for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);
	}
	console.log(
		`Granting operating initials for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
	);
}

async function grantRoles(db: Database, user: User, controller: VatsimController | null) {
	// Remove any of the VATUSA Roles that might already exist for the user
	await db
		.delete(userRolesTable)
		.where(
			and(
				eq(userRolesTable.userId, user.id),
				inArray(userRolesTable.role, VATUSA_MANAGED_MEMBERSHIP_ROLES)
			)
		);

	// If no controller is found, don't grant any roles
	if (!controller) {
		console.log(
			`No controller found for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`
		);

		return;
	}

	console.log(`Granting roles for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName})`);

	// Get the user's VATUSA roles for this facility
	const vatsimRoles = controller.data.roles
		.filter((role) => role.facility === ARTCC_ID)
		.map((role) => role.role);

	console.log(
		`VATUSA roles for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName}): ${vatsimRoles.join(', ')}`
	);

	// Now build a set of roles to apply to the user
	const rolesToApply = Array.from(
		new Set(
			vatsimRoles.flatMap((role) => {
				if (Object.keys(VATUSA_ROLES_TO_MEMBERSHIP_ROLES).includes(role)) {
					return VATUSA_ROLES_TO_MEMBERSHIP_ROLES[
						role as keyof typeof VATUSA_ROLES_TO_MEMBERSHIP_ROLES
					].map((role) => role);
				}
				return [];
			})
		)
	);

	console.log(
		`Roles to apply for ${user.id} (${user.cid} -> ${user.firstName} ${user.lastName}): ${rolesToApply.join(', ')}`
	);

	// Apply the roles to the user
	if (rolesToApply.length > 0) {
		await db
			.insert(userRolesTable)
			.values(rolesToApply.map((role) => ({ userId: user.id, role: role })));
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
		.returning();

	console.log(`Demoted ${demotedResult.length} users from controller to community`);

	// Do leaving controller processing
	for (const user of demotedResult) {
		await processLeavingController(db, user);
	}

	// Get and promote community members who should be controllers
	const usersToPromote = await db
		.select({ id: usersTable.id, cid: usersTable.cid })
		.from(usersTable)
		.innerJoin(vatsimControllersTable, eq(usersTable.cid, vatsimControllersTable.cid))
		.where(not(eq(usersTable.membership, 'controller')));

	for (const user of usersToPromote) {
		console.log(`Promoting user ${user.id} (${user.cid}) to controller`);

		const [updatedUser] = await db
			.update(usersTable)
			.set({ membership: 'controller' })
			.where(eq(usersTable.id, user.id))
			.returning();

		const controller = await db.query.vatsimControllersTable.findFirst({
			where: eq(vatsimControllersTable.cid, user.cid)
		});

		if (controller) {
			await processNewController(db, updatedUser, controller);
		}
	}

	console.log(`Promoted ${usersToPromote.length} users from community to controller`);

	// Now do role sync for all controllers
	const usersToSync = await db.query.usersTable.findMany({
		where: eq(usersTable.membership, 'controller')
	});

	for (const user of usersToSync) {
		await syncUserMembership(db, user);
	}
	console.log('Bulk membership sync complete');
}

function generateOperatingInitialCombinations(firstName: string, lastName: string) {
	const combinations = [
		...generatePyramidCombinations(lastName),
		...generatePyramidCombinations(firstName),
		...generateAlphabeticalCombinations(lastName),
		...generateAlphabeticalCombinations(firstName)
	];

	return combinations;
}

function generatePyramidCombinations(input: string) {
	const pyramid = [];
	for (let i = input.length - 1; i > 0; i--) {
		const combo = input[0] + input[i];
		pyramid.push(combo.toUpperCase());
	}

	return pyramid;
}

function generateAlphabeticalCombinations(input: string) {
	const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	return generatePyramidCombinations(input[0] + ALPHABET);
}
