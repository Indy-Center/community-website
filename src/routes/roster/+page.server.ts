import { fetchControllers } from '$lib/server/vatsim/vnasDataClient.js';
import { readAvailableCredentials } from '$lib/server/roster';
import { getStaffBadges } from '$lib/server/staff';
import { isAdmin } from '$lib/utils/permissions';

// Page data goes to every visitor's browser, so build each member from only what the page
// shows: never the user row (email, Connect data) or a hidden last name from the roster copy.
export const load = async ({ locals }) => {
	const [results, credentials, assignments, teamRows, pocs, controllers] = await Promise.all([
		locals.db.query.vatsimControllersTable.findMany({
			columns: {
				cid: true,
				firstName: true,
				lastName: true,
				namePrivacy: true,
				rating: true,
				facilityJoinedAt: true,
				roles: true,
				certification: true,
				endorsements: true
			},
			with: {
				user: { columns: { id: true, preferredName: true, operatingInitials: true } }
			}
		}),
		readAvailableCredentials(locals.db),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		locals.db.query.staffPocsTable.findMany(),
		fetchControllers()
	]);

	const staffBadges = Object.fromEntries(getStaffBadges(results, assignments, teamRows, pocs));
	const admin = isAdmin(locals.roles);

	const roster = results.map((member) => ({
		cid: member.cid,
		name:
			member.user?.preferredName ||
			`${member.firstName} ${member.namePrivacy ? member.cid : member.lastName}`,
		rating: member.rating,
		joined: member.facilityJoinedAt,
		operatingInitials: member.user?.operatingInitials ?? null,
		certification: member.certification,
		endorsements: member.endorsements,
		// Only admins see the link to manage a member's account
		...(admin && member.user ? { userId: member.user.id } : {})
	}));

	return {
		roster,
		credentials,
		controllers,
		staffBadges
	};
};
