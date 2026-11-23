import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { getStaffBadges } from '$lib/server/staff';
import { readAvailableCredentials } from '$lib/server/roster';
import { memberName } from '$lib/members';

// Public profile. Like the public roster, only controllers on the roster have one, and
// only public fields are sent (no email, raw VATSIM data, or feedback).
export const load = async ({ locals, params }) => {
	const [controller, credentials, assignments, teamRows, pocs] = await Promise.all([
		locals.db.query.vatsimControllersTable.findFirst({
			where: eq(vatsimControllersTable.cid, params.cid),
			with: { user: true }
		}),
		readAvailableCredentials(locals.db),
		locals.db.query.staffAssignmentsTable.findMany(),
		locals.db.query.staffTeamMembersTable.findMany(),
		locals.db.query.staffPocsTable.findMany()
	]);

	if (!controller) {
		error(404, 'Controller not found');
	}

	const user = controller.user;
	const name = memberName({ ...controller, preferredName: user?.preferredName });

	return {
		profile: {
			cid: controller.cid,
			name,
			pronouns: user?.pronouns ?? null,
			membership: user?.membership ?? ('controller' as const),
			operatingInitials: user?.operatingInitials ?? null,
			// The roster copy is refreshed from the training app every few minutes; the
			// account's VATSIM data is only saved at sign-in, so it can be out of date
			atcRating: controller.rating || user?.data.vatsim.rating.short || null,
			pilotRating: user?.data.vatsim.pilotrating.short || null,
			bio: user?.bio ?? null,
			staffBadges:
				getStaffBadges([controller], assignments, teamRows, pocs).get(controller.cid) ?? [],
			certifications: controller.certification ? [controller.certification] : [],
			endorsements: controller.endorsements,
			credentials: credentials.map(({ code, name }) => ({ code, name }))
		},
		isOwnProfile: locals.user?.cid === controller.cid
	};
};
