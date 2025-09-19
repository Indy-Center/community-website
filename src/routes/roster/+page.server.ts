import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';

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

	const controllers = await fetchControllers();

	return {
		roster: results,
		controllers
	};
};
