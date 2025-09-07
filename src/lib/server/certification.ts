import type { Database } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { userCertificationsTable, usersTable } from '../db/schema';
import type { User } from '../user';
import { addMonths } from 'date-fns';

export type Certification = typeof userCertificationsTable.$inferSelect;
export type CreateCertificationParams = typeof userCertificationsTable.$inferInsert;

export async function refreshCertifications(db: Database) {
	// Update all certifications where the member is still 'controller' indicating they are rostered.
	const updatedCertifications = await db
		.update(userCertificationsTable)
		.set({
			expires_at: addMonths(new Date(), 6)
		})
		.from(usersTable)
		.where(
			and(
				eq(usersTable.membership, 'controller'),
				eq(userCertificationsTable.user_id, usersTable.id)
			)
		)
		.returning();

	return updatedCertifications;
}

export async function generateCertificationsForUser(db: Database, user: User) {
	if (!user.controller) {
		return [];
	}

	const certifications = getCertificatesForRating(user.controller.data.rating_short);

	const createdCertifications = await db
		.insert(userCertificationsTable)
		.values(
			certifications.map((cert) => ({
				user_id: user.id,
				certification: cert,
				expires_at: addMonths(new Date(), 6)
			}))
		)
		.onConflictDoNothing({
			target: [userCertificationsTable.user_id, userCertificationsTable.certification]
		});

	return createdCertifications;
}

function getCertificatesForRating(rating: string) {
	switch (rating) {
		case 'S1':
			return ['GND'];
		case 'S2':
			return ['TWR'];
		case 'S3':
			return ['TWR'];
		case 'C1':
			return ['CTR'];
		case 'C3':
			return ['CTR'];
		case 'I1':
			return ['CTR'];
		case 'I3':
			return ['CTR'];
		default:
			return [];
	}
}
