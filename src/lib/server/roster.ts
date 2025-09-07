import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { userCertificationsTable, usersTable, vatsimControllersTable } from './db/schema';

export async function listRoster(db: Database) {
	const rows = await db
		.select({
			controller: vatsimControllersTable,
			user: usersTable,
			certification: userCertificationsTable
		})
		.from(vatsimControllersTable)
		.leftJoin(usersTable, eq(vatsimControllersTable.cid, usersTable.cid))
		.leftJoin(userCertificationsTable, eq(usersTable.id, userCertificationsTable.user_id));

	// Reduce the rows down to { controller, user, certifications}
	const result = rows.reduce((acc, row) => {
		const controller = row.controller;
		const user = row.user;
		const certification = row.certification;

		// Use controller.cid as the key since that's unique per controller
		if (!acc.find((item) => item.controller.cid === controller.data.cid)) {
			acc.push({
				controller: controller.data,
				user: user,
				certifications: []
			});
		}

		if (certification) {
			acc
				.find((item) => item.controller.cid === controller.data.cid)
				?.certifications.push(certification);
		}

		return acc;
	}, [] as RosterItem[]);

	return Object.values(result);
}

export type RosterItem = {
	controller: VatsimControllerData;
	user: typeof usersTable.$inferSelect | null;
	certifications: (typeof userCertificationsTable.$inferSelect)[];
};

export type VatsimControllerData = typeof vatsimControllersTable.$inferSelect.data;
