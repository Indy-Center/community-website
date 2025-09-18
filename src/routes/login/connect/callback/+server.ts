import type { RequestEvent } from '@sveltejs/kit';
import { decodeIdToken, OAuth2Tokens } from 'arctic';
import { client } from '$lib/server/oauth';
import { usersTable } from '$lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { createSession, generateSessionToken, setSessionTokenCookie } from '$lib/server/session';
import { env } from '$env/dynamic/private';
import { fetchUserData } from '$lib/server/vatsim/vatsimConnectClient';

import type { User } from '$lib/db/schema/users';
import { syncUserMembership } from '$lib/server/membership';
import { DiscordChannel, sendDiscordEmbed } from '$lib/server/discord';

export async function GET({ locals, url, cookies }: RequestEvent): Promise<Response> {
	// Extract query parameters
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('connect_oauth_state');

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
	const existingUser = await locals.db.query.usersTable.findFirst({
		where: eq(usersTable.cid, userDetails.cid)
	});

	let user: User;
	if (existingUser) {
		// Update existing user's basic info
		const [updatedUser] = await locals.db
			.update(usersTable)
			.set({
				firstName: userDetails.personal.name_first,
				lastName: userDetails.personal.name_last,
				email: userDetails.personal.email,
				data: userDetails
			})
			.where(eq(usersTable.id, existingUser.id))
			.returning();

		user = updatedUser;
	} else {
		// Create new user
		const [newUser] = await locals.db
			.insert(usersTable)
			.values({
				id: crypto.randomUUID(),
				cid: userDetails.cid,
				firstName: userDetails.personal.name_first,
				lastName: userDetails.personal.name_last,
				email: userDetails.personal.email,
				membership: 'basic',
				data: userDetails
			})
			.returning();

		user = newUser;
		await sendDiscordEmbed(DiscordChannel.TECH_TEAM_ALERTS, {
			title: 'New User Registered',
			description: `User ${user.firstName} ${user.lastName} (${user.cid}) has registered`,
			color: 0x5865f2,
			fields: [],
			footer: { text: null },
			timestamp: new Date().toISOString()
		});
	}

	// Sync controller membership and certifications
	await syncUserMembership(locals.db, user);

	// Create session
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, locals.db);
	setSessionTokenCookie(cookies, sessionToken, session.expiresAt);

	// Get return URL from cookie, default to '/'
	const returnUrl = cookies.get('connect_return_url') || '/';

	// Clear the return URL cookie
	cookies.delete('connect_return_url', { path: '/' });

	return new Response(null, {
		status: 302,
		headers: {
			Location: returnUrl
		}
	});
}
