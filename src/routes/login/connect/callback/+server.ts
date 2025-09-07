import type { RequestEvent } from '@sveltejs/kit';
import { decodeIdToken, OAuth2Tokens } from 'arctic';
import { client } from '$lib/server/oauth';
import { usersTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, generateSessionToken, setSessionTokenCookie } from '$lib/server/session';
import { env } from '$env/dynamic/private';
import { fetchUserData } from '$lib/server/vatsim/vatsimConnectClient';
import { createUser, findUserByCid, updateUser, syncUserMembership } from '$lib/server/user';

export async function GET(event: RequestEvent): Promise<Response> {
	// Extract query parameters
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('connect_oauth_state');

	// Validate parameters
	if (!code || !state || !storedState) {
		console.error('Missing required query parameters or cookies', { code, state, storedState });
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (state !== storedState) {
		console.error('State mismatch', { received: state, expected: storedState });
		return new Response(JSON.stringify({ error: 'State mismatch' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let tokens: OAuth2Tokens;
	try {
		// Exchange the authorization code for tokens
		tokens = await client.validateAuthorizationCode(
			`${env.CONNECT_BASE_URL!}/oauth/token`,
			code,
			null
		);
	} catch (error) {
		console.error('Error during token exchange', error);
		return new Response(JSON.stringify({ error: 'Failed to validate authorization code' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Fetch user details
	const userDetails = await fetchUserData(tokens.accessToken());
	if (!userDetails) {
		return new Response(JSON.stringify({ error: 'Failed to fetch user details' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Decode the ID token to extract claims
	try {
		const claims = decodeIdToken(tokens.accessToken());
	} catch (error) {
		console.error('Error decoding ID token', error);
		return new Response(JSON.stringify({ error: 'Invalid ID token' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Check if user already exists
	const existingUser = await findUserByCid(event.locals.db, userDetails.cid);

	let user;
	if (existingUser) {
		// Update existing user's basic info
		user = await updateUser(event.locals.db, userDetails.cid, {
			firstName: userDetails.personal.name_first,
			lastName: userDetails.personal.name_last,
			email: userDetails.personal.email
		});
	} else {
		// Create new user
		user = await createUser(event.locals.db, {
			id: crypto.randomUUID(),
			cid: userDetails.cid,
			firstName: userDetails.personal.name_first,
			lastName: userDetails.personal.name_last,
			email: userDetails.personal.email,
			membership: 'basic'
		});
	}

	// Sync controller membership and certifications
	user = (await syncUserMembership(event.locals.db, userDetails.cid)) || user;

	// Create session
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, event.locals.db);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
}
