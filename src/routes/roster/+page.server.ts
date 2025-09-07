import { listRoster } from '$lib/server/roster';

export const load = async ({ locals }) => {
	const rosterWithUsersAndCertifications = await listRoster(locals.db);

	return { roster: rosterWithUsersAndCertifications };
};
