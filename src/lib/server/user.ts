import type { Database } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { usersTable, vatsimControllersTable } from '$lib/db/schema';
import { generateCertificationsForUser } from './certification';
import type { User, CreateUserParams } from '$lib/user';

export async function findUser(db: Database, id: string): Promise<User | null> {
	return (
		(await db.query.usersTable.findFirst({
			where: eq(usersTable.id, id),
			with: {
				controller: true,
				certifications: true,
				endorsements: true,
				roles: true
			}
		})) ?? null
	);
}

export async function findUserByCid(db: Database, cid: string): Promise<User | null> {
	return (
		(await db.query.usersTable.findFirst({
			where: eq(usersTable.cid, cid),
			with: {
				controller: true,
				certifications: true,
				endorsements: true,
				roles: true
			}
		})) ?? null
	);
}

export async function createUser(db: Database, params: CreateUserParams): Promise<User> {
	// Check if user already exists
	const existingUser = await findUserByCid(db, params.cid);
	if (existingUser) {
		return existingUser;
	}

	// Create user
	const [user] = await db.insert(usersTable).values(params).returning();

	return user;
}

export async function updateUser(
	db: Database,
	cid: string,
	updates: Partial<CreateUserParams>
): Promise<User> {
	const [user] = await db
		.update(usersTable)
		.set(updates)
		.where(eq(usersTable.cid, cid))
		.returning();

	return user;
}

export async function syncUserMembership(db: Database, cid: string): Promise<User | null> {
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
			await generateCertificationsForUser(db, updatedUser, controller.data);
		}
		return updatedUser;
	} else if (!controller && user.membership === 'controller') {
		// Demote from controller
		return await updateUser(db, cid, { membership: 'community' });
	}

	return user;
}
