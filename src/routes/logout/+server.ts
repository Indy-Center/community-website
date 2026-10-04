import { revokeToken } from '$lib/server/identity';
import { deleteSessionTokenCookie, invalidateSession } from '$lib/server/session';
import { redirect, type RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => {
	const session = event.locals.session;

	if (session) {
		if (session.data?.identityToken) {
			await revokeToken(session.data.identityToken);
		}
		await invalidateSession(session.id, event.locals.db);
	}

	deleteSessionTokenCookie(event.cookies);

	throw redirect(302, '/');
};
