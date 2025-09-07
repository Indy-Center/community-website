import type {
	Database,
	userCertificationsTable,
	userEndorsementsTable,
	userRolesTable
} from '$lib/server/db';
import { and, eq, inArray } from 'drizzle-orm';
import { usersTable, vatsimControllersTable } from './db/schema';
import { generateCertificationsForUser } from './services/certification';

export type User = typeof usersTable.$inferSelect & {
	controller: typeof vatsimControllersTable.$inferSelect | null;
	certifications: (typeof userCertificationsTable.$inferSelect)[];
	endorsements: (typeof userEndorsementsTable.$inferSelect)[];
	roles: (typeof userRolesTable.$inferSelect)[];
};

export type CreateUserParams = typeof usersTable.$inferInsert;

// User utility functions for role checking and user operations
export const userUtils = {
	hasRole: (user: User, role: string): boolean => {
		return user.roles.some((r) => r.role === role);
	},

	hasAnyRole: (user: User, roles: string[]): boolean => {
		return roles.some((role) => userUtils.hasRole(user, role));
	},

	hasAllRoles: (user: User, roles: string[]): boolean => {
		return roles.every((role) => userUtils.hasRole(user, role));
	},

	isAdmin: (user: User): boolean => {
		return userUtils.hasRole(user, 'admin');
	},

	isModerator: (user: User): boolean => {
		return userUtils.hasRole(user, 'moderator');
	},

	isController: (user: User): boolean => {
		return user.membership === 'controller' || !!user.controller;
	},

	isStaff: (user: User): boolean => {
		return userUtils.hasAnyRole(user, ['admin', 'moderator', 'staff']);
	},

	hasCertification: (user: User, certification: string): boolean => {
		return user.certifications.some((c) => c.certification === certification);
	},

	hasEndorsement: (user: User, endorsement: string): boolean => {
		return user.endorsements.some((e) => e.endorsement === endorsement);
	},

	getFullName: (user: User): string => {
		return user.preferredName
			? `${user.preferredName} ${user.lastName}`
			: `${user.firstName} ${user.lastName}`;
	}
};

export async function findUser(db: Database, id: string): Promise<User | null> {
	return await db.query.usersTable.findFirst({
		where: eq(usersTable.id, id),
		with: {
			controller: true,
			certifications: true,
			endorsements: true,
			roles: true
		}
	});
}

export async function findUserByCid(db: Database, cid: string): Promise<User | null> {
	return await db.query.usersTable.findFirst({
		where: eq(usersTable.cid, cid),
		with: {
			controller: true,
			certifications: true,
			endorsements: true,
			roles: true
		}
	});
}

export async function createUser(db: Database, params: CreateUserParams) {
	// Check if user already exists
	const existingUser = await findUserByCid(db, params.cid);
	if (existingUser) {
		return existingUser;
	}

	// Create user
	const [user] = await db.insert(usersTable).values(params).returning();

	return user;
}

export async function updateUser(db: Database, cid: string, updates: Partial<CreateUserParams>) {
	const [user] = await db
		.update(usersTable)
		.set(updates)
		.where(eq(usersTable.cid, cid))
		.returning();

	return user;
}

export async function syncUserMembership(db: Database, cid: string) {
	// Check if user is in controller roster
	const controller = await db.query.vatsimControllersTable.findFirst({
		where: eq(vatsimControllersTable.cid, cid)
	});

	// Get current user
	const user = await findUserByCid(db, cid);
	if (!user) return null;

	// Update membership if needed
	if (controller && user.membership !== 'controller') {
		// Promote to controller and generate certifications
		await updateUser(db, cid, { membership: 'controller' });
		const updatedUser = await findUserByCid(db, cid);
		if (updatedUser) {
			await generateCertificationsForUser(db, updatedUser);
		}
		return updatedUser;
	} else if (!controller && user.membership === 'controller') {
		// Demote from controller
		return await updateUser(db, cid, { membership: 'community' });
	}

	return user;
}
