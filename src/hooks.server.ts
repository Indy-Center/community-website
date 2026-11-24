import * as Sentry from '@sentry/sveltekit';
import { instrumentD1WithSentry } from '@sentry/cloudflare';
import { sequence } from '@sveltejs/kit/hooks';
import { colorSchemeHandle } from '@indy-center/centerline-svelte/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { bookingsApiFromEnv } from '$lib/server/bookingsApi';
import { cacheApiReadStore, memoryReadStore } from '$lib/server/keptReads';
import { createPositionsReader } from '$lib/server/positions';
import { cacheApiStore, createCms, memoryStore } from '$lib/server/cms';
import { drizzle } from '$lib/server/db';

import { identityEnabled, toSiteRoles } from '$lib/server/identity';
import { checkIdentity } from '$lib/server/identityCheck';
import { logger } from '$lib/server/logger';
import {
	validateSessionToken,
	deleteSessionTokenCookie,
	invalidateSession,
	setSessionTokenCookie
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
	colorScheme,
	dbHandle,
	cmsHandle,
	bookingsHandle,
	authHandle
);

// Writes each member's light or dark choice on <html>; dark when they haven't chosen.
// Centerline types `resolve` as always returning a Promise, where Kit's may return a Response,
// so it's wrapped to fit `Handle`.
const centerlineColorScheme = colorSchemeHandle({ fallback: 'dark' });
function colorScheme({ event, resolve }: Parameters<Handle>[0]) {
	return centerlineColorScheme({ event, resolve: async (e, opts) => resolve(e, opts) });
}

async function dbHandle({ event, resolve }: Parameters<Handle>[0]) {
	event.locals.db = drizzle(instrumentD1WithSentry(event.platform?.env.DB!));

	return await resolve(event);
}

// Kept copies under `vite dev`, whose Cache API keeps nothing. Never used on Cloudflare.
const devCopies = memoryStore();
let warnedNoToken = false;

async function cmsHandle({ event, resolve }: Parameters<Handle>[0]) {
	if (!env.COMMUNITY_API_TOKEN && !warnedNoToken) {
		warnedNoToken = true;
		logger.warn('COMMUNITY_API_TOKEN is not set; the CMS will refuse every read');
	}
	const cache = event.platform?.caches?.default;
	event.locals.cms = createCms({
		baseUrl: env.CMS_URL ?? 'https://cms.flyindycenter.com',
		token: env.COMMUNITY_API_TOKEN,
		fetch: (input, init) => fetch(input, init),
		store: dev || !cache ? devCopies : cacheApiStore(cache)
	});

	return await resolve(event);
}

// Kept reads under `vite dev`, as for the CMS. Never used on Cloudflare.
const devReads = memoryReadStore();
let warnedNoBookings = false;

// The CMS positions catalogue, for Centerline's Position everywhere, and the booking system's
// client, or undefined without its settings (bookings show empty, booking off)
async function bookingsHandle({ event, resolve }: Parameters<Handle>[0]) {
	const cache = event.platform?.caches?.default;
	const store = dev || !cache ? devReads : cacheApiReadStore(cache);
	event.locals.positions = createPositionsReader({
		cmsUrl: env.CMS_URL ?? 'https://cms.flyindycenter.com',
		store
	});
	event.locals.bookings = bookingsApiFromEnv(env, store);
	if (!event.locals.bookings && !warnedNoBookings) {
		warnedNoBookings = true;
		logger.warn('VATSIM_BOOKING_API_URL or VATSIM_BOOKING_API_KEY is not set; booking is off');
	}

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

	// A session from before sign-in moved to identity has no identity token, so identity (and larry,
	// which links TeamSpeak and Discord through it) may not know the member. It is ended, and the
	// member signs in again through identity.
	if (identityEnabled() && !session.data?.identityToken) {
		logger.info(`Ended a pre-identity session for ${user.cid}`);
		await invalidateSession(session.id, event.locals.db);
		Sentry.setUser(null);
		deleteSessionTokenCookie(event.cookies);
		return await resolve(event);
	}

	// Identity sessions add identity's roles to the locally computed ones (which
	// aren't pushed to identity yet).
	let siteRoles = roles;
	let signedIn = user;
	if (session.data?.identityToken && identityEnabled()) {
		const checked = await checkIdentity(session, user, event.locals.db);
		if (!checked) {
			await invalidateSession(session.id, event.locals.db);
			Sentry.setUser(null);
			deleteSessionTokenCookie(event.cookies);
			return await resolve(event);
		}
		siteRoles = [...new Set([...roles, ...toSiteRoles(checked.roles)])];
		signedIn = checked.user;
	}

	Sentry.setUser({ id: user.id, cid: user.cid });
	event.locals.user = signedIn;
	event.locals.roles = siteRoles;

	setSessionTokenCookie(event.cookies, token, session.expiresAt);
	event.locals.session = session;

	return await resolve(event);
}

export const handleError = Sentry.handleErrorWithSentry();
