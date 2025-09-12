import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { usersTable } from '$lib/db/schema/users';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers.js';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';

const ARTCC_ID = 'ZID';

type PageData = {
	roster: (typeof vatsimControllersTable.$inferSelect & {
		user:
			| (typeof usersTable.$inferSelect & {
					certifications: (typeof userCertificationsTable.$inferSelect)[];
					endorsements: (typeof userEndorsementsTable.$inferSelect)[];
			  })
			| null;
	})[];
	controllers: any[];
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

	const controllers = await fetchControllers(ARTCC_ID);

	return { 
		roster: results, 
		controllers 
	};
};
