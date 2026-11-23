import { eq } from 'drizzle-orm';
import { vatsimControllersTable } from '$lib/db/schema/vatsimControllers';
import { memberName } from '$lib/members';

// Sent to the browser on every page. No page needs the session, and its data holds the
// visitor's identity access token, so it stays on the server.
export async function load({ locals }: { locals: App.Locals }) {
	const user = locals.user;
	const rosterEntry = user
		? await locals.db.query.vatsimControllersTable.findFirst({
				where: eq(vatsimControllersTable.cid, user.cid),
				columns: { namePrivacy: true }
			})
		: undefined;

	return {
		user,
		/** The header's name for the signed-in member, as every page shows them. */
		userName: user ? memberName({ ...user, namePrivacy: rosterEntry?.namePrivacy }) : null,
		roles: locals.roles
	};
}
