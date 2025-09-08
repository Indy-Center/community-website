import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { usersTable } from '$lib/db/schema/users';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers.js';

type PageData = {
	roster: (typeof vatsimControllersTable.$inferSelect & {
		user:
			| (typeof usersTable.$inferSelect & {
					certifications: (typeof userCertificationsTable.$inferSelect)[];
					endorsements: (typeof userEndorsementsTable.$inferSelect)[];
			  })
			| null;
	})[];
};

export const load = async ({ locals }): Promise<PageData> => {
	const results = await locals.db.query.vatsimControllersTable.findMany({
		with: {
			user: {
				with: {
					certifications: true,
					endorsements: true
				}
			}
		}
	});

	return { roster: results };
};
