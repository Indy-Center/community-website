import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { getStaffBadges } from '$lib/server/staff';
import { isAdmin } from '$lib/utils/permissions';

// Page data goes to every visitor's browser, so build each member from only what the page
// shows: never the user row (email, Connect data) or VATUSA's row (a hidden last name).
export const load = async ({ locals }) => {
	const [results, assignments, teamRows, controllers] = await Promise.all([
		locals.db.query.vatsimControllersTable.findMany({
			with: {
				user: {
					columns: { id: true, preferredName: true, operatingInitials: true },
					with: {
						certifications: { columns: { certification: true } },
						endorsements: { columns: { endorsement: true } }
					}
				}
			}
		}),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		fetchControllers()
	]);

	const staffBadges = Object.fromEntries(getStaffBadges(results, assignments, teamRows));
	const admin = isAdmin(locals.roles);

	const roster = results.map(({ cid, data, user }) => ({
		cid,
		name: user?.preferredName || `${data.fname} ${data.flag_nameprivacy ? cid : data.lname}`,
		rating: data.rating_short,
		joined: data.facility_join,
		operatingInitials: user?.operatingInitials ?? null,
		certifications: user?.certifications.map((c) => c.certification) ?? [],
		endorsements: user?.endorsements.map((e) => e.endorsement) ?? [],
		// Only admins see the link to manage a member's account
		...(admin && user ? { userId: user.id } : {})
	}));

	return {
		roster,
		controllers,
		staffBadges
	};
};
