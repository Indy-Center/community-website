import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { drizzle } from '$lib/server/db';

import {
	validateSessionToken,
	deleteSessionTokenCookie,
	setSessionTokenCookie
} from '$lib/server/session';

export const handle = sequence(
	Sentry.initCloudflareSentryHandle({
		dsn: 'https://7eb744b3548181e2660a874c28f50201@o4510043972304896.ingest.us.sentry.io/4510043975843840',
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
		enableLogs: true,
		integrations: [
			// send console.log, console.warn, and console.error calls as logs to Sentry
			Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })
		]
	}),
	Sentry.sentryHandle(),
	dbHandle,
	authHandle
);

async function dbHandle({ event, resolve }: Parameters<Handle>[0]) {
	event.locals.db = drizzle(event.platform?.env.DB!);

	return await resolve(event);
}

// Handle session authentication (no redirects)
async function authHandle({ event, resolve }: Parameters<Handle>[0]) {
	event.locals.roles = [];

	const token = event.cookies.get('session');
	if (!token) {
		return await resolve(event);
	}

	const { user, session, roles } = await validateSessionToken(token, event.locals.db);

	if (!session) {
		deleteSessionTokenCookie(event.cookies);
		return await resolve(event);
	}
	event.locals.user = user;
	event.locals.roles = roles;

	setSessionTokenCookie(event.cookies, token, session.expiresAt);
	event.locals.session = session;

	return await resolve(event);
}
export const handleError = Sentry.handleErrorWithSentry();
