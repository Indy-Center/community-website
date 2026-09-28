import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { getStaffBadges } from '$lib/server/staff';

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

	const staffBadges = Object.fromEntries(await getStaffBadges(locals.db, results));

	return {
		roster: results,
		controllers,
		staffBadges
	};
};
