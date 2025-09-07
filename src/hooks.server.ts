import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { drizzle } from '$lib/server/db';

import {
	validateSessionToken,
	deleteSessionTokenCookie,
	setSessionTokenCookie
} from '$lib/server/session';

export const handle = sequence(dbHandle, authHandle);

async function dbHandle({ event, resolve }: Parameters<Handle>[0]) {
	event.locals.db = drizzle(event.platform?.env.DB!);

	return await resolve(event);
}

// Handle session authentication (no redirects)
async function authHandle({ event, resolve }: Parameters<Handle>[0]) {
	const token = event.cookies.get('session');
	if (!token) {
		return await resolve(event);
	}

	const { user, session } = await validateSessionToken(token, event.locals.db);

	if (!session) {
		deleteSessionTokenCookie(event);
		return await resolve(event);
	}
	event.locals.user = user;

	setSessionTokenCookie(event, token, session.expiresAt);
	event.locals.session = session;

	return await resolve(event);
}
