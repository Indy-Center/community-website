import { deleteSessionTokenCookie, invalidateSession } from '$lib/server/session';
import { redirect, type RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		await invalidateSession(sessionId, event.locals.db);
	}

	deleteSessionTokenCookie(event);

	throw redirect(302, '/');
};
