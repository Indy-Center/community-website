import type { Database } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { userCertificationsTable, usersTable } from '$lib/db/schema';
import type { User } from '$lib/user';
import { addMonths } from 'date-fns';
import type { VatsimControllerData } from './roster';

export type Certification = typeof userCertificationsTable.$inferSelect;
export type CreateCertificationParams = typeof userCertificationsTable.$inferInsert;

export async function refreshCertifications(db: Database) {
	// Update all certifications where the member is still 'controller' indicating they are rostered.
	const updatedCertifications = await db
		.update(userCertificationsTable)
		.set({
			expiresAt: addMonths(new Date(), 6)
		})
		.from(usersTable)
		.where(
			and(
				eq(usersTable.membership, 'controller'),
				eq(userCertificationsTable.userId, usersTable.id)
			)
		)
		.returning();

	return updatedCertifications;
}

export async function generateCertificationsForUser(
	db: Database,
	user: User,
	controller: VatsimControllerData
) {
	if (!controller) {
		return [];
	}

	const certifications = getCertificatesForRating(controller.rating_short);

	if (certifications.length === 0) {
		return [];
	}

	const createdCertifications = await db
		.insert(userCertificationsTable)
		.values(
			certifications.map((cert) => ({
				userId: user.id,
				certification: cert,
				expires_at: addMonths(new Date(), 6)
			}))
		)
		.onConflictDoNothing({
			target: [userCertificationsTable.userId, userCertificationsTable.certification]
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
