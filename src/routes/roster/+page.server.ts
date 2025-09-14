import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { usersTable } from '$lib/db/schema/users';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers.js';
import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';

const ARTCC_ID = 'ZID';

export const load = async ({ locals }) => {
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
