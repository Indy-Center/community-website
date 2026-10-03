import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { getStaffBadges } from '$lib/server/staff';

export const load = async ({ locals }) => {
	const [results, assignments, teamRows, controllers] = await Promise.all([
		locals.db.query.vatsimControllersTable.findMany({
			with: {
				user: {
					with: {
						certifications: true,
						endorsements: true
					}
				}
			}
		}),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		fetchControllers()
	]);

	const staffBadges = Object.fromEntries(getStaffBadges(results, assignments, teamRows));

	return {
		roster: results,
		controllers,
		staffBadges
	};
};
