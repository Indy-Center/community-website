import * as Sentry from '@sentry/sveltekit';
import { instrumentD1WithSentry } from '@sentry/cloudflare';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { drizzle, type Database } from '$lib/server/db';

import { fetchUserinfo, identityEnabled, toSiteRoles } from '$lib/server/identity';
import { logger } from '$lib/server/logger';
import {
	validateSessionToken,
	deleteSessionTokenCookie,
	invalidateSession,
	setSessionTokenCookie,
	updateSessionData,
	type Session
} from '$lib/server/session';

export const handle = sequence(
	Sentry.initCloudflareSentryHandle({
		dsn: 'https://7eb744b3548181e2660a874c28f50201@o4510043972304896.ingest.us.sentry.io/4510043975843840',
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
		enableLogs: true,
		enabled: import.meta.env.PROD
	}),
	Sentry.sentryHandle(),
	dbHandle,
	authHandle
);

async function dbHandle({ event, resolve }: Parameters<Handle>[0]) {
	event.locals.db = drizzle(instrumentD1WithSentry(event.platform?.env.DB!));

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
		Sentry.setUser(null);
		deleteSessionTokenCookie(event.cookies);
		return await resolve(event);
	}

	// Identity sessions add identity's roles to the locally computed ones (which
	// aren't pushed to identity yet).
	let siteRoles = roles;
	if (session.data?.identityToken && identityEnabled()) {
		const identityRoles = await currentIdentityRoles(session, event.locals.db);
		if (!identityRoles) {
			await invalidateSession(session.id, event.locals.db);
			Sentry.setUser(null);
			deleteSessionTokenCookie(event.cookies);
			return await resolve(event);
		}
		siteRoles = [...new Set([...roles, ...toSiteRoles(identityRoles)])];
	}

	Sentry.setUser({ id: user.id, cid: user.cid });
	event.locals.user = user;
	event.locals.roles = siteRoles;

	setSessionTokenCookie(event.cookies, token, session.expiresAt);
	event.locals.session = session;

	return await resolve(event);
}

const IDENTITY_RECHECK_MS = 5 * 60 * 1000;

// Asks identity for the user's roles at most every few minutes, keeping the
// answer on the session. Returns null when identity rejects the token: the
// user logged out or was disabled there. If identity can't be reached, the
// last known roles stand.
async function currentIdentityRoles(session: Session, db: Database): Promise<string[] | null> {
	const data = session.data!;
	const lastKnown = data.identityRoles ?? [];
	if (Date.now() - (data.identityCheckedAt ?? 0) < IDENTITY_RECHECK_MS) {
		return lastKnown;
	}

	try {
		const claims = await fetchUserinfo(data.identityToken!);
		if (!claims) {
			return null;
		}
		await updateSessionData(
			session.id,
			{ ...data, identityRoles: claims.roles, identityCheckedAt: Date.now() },
			db
		);
		return claims.roles;
	} catch (error) {
		logger.error('Identity userinfo check failed', error);
		return lastKnown;
	}
}

export const handleError = Sentry.handleErrorWithSentry();
