import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { usersTable, type User } from '$lib/db/schema/users';
import { DiscordChannel, sendDiscordEmbed } from '$lib/server/discord';
import { fetchUserinfo, identityClient, identityUrl, toVatsimUserData } from '$lib/server/identity';
import { logger } from '$lib/server/logger';
import { syncUserMembership } from '$lib/server/membership';
import { createSession, generateSessionToken, setSessionTokenCookie } from '$lib/server/session';

export async function GET({ locals, url, cookies }: RequestEvent): Promise<Response> {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('connect_oauth_state');
	cookies.delete('connect_oauth_state', { path: '/' });

	if (!code || !state || state !== storedState) {
		logger.error('Identity callback with missing or mismatched state');
		error(400, 'Invalid login request');
	}

	let accessToken: string;
	try {
		const tokens = await identityClient(url.origin).validateAuthorizationCode(
			identityUrl('/oauth/token'),
			code,
			null
		);
		accessToken = tokens.accessToken();
	} catch (err) {
		logger.error('Error during identity token exchange', err);
		error(400, 'Failed to validate authorization code');
	}

	const claims = await fetchUserinfo(accessToken);
	if (!claims) {
		error(401, 'Identity rejected the login');
	}

	const profile = {
		firstName: claims.given_name ?? '',
		lastName: claims.family_name ?? '',
		email: claims.email,
		data: toVatsimUserData(claims)
	};

	const existingUser = await locals.db.query.usersTable.findFirst({
		where: eq(usersTable.cid, claims.sub)
	});

	let user: User;
	if (existingUser) {
		[user] = await locals.db
			.update(usersTable)
			.set(profile)
			.where(eq(usersTable.id, existingUser.id))
			.returning();
	} else {
		[user] = await locals.db
			.insert(usersTable)
			.values({ id: crypto.randomUUID(), cid: claims.sub, membership: 'basic', ...profile })
			.returning();

		logger.info(`New user created: CID ${user.cid} (${user.firstName} ${user.lastName})`);
		await sendDiscordEmbed(DiscordChannel.TECH_TEAM_ALERTS, {
			title: 'New User Registered',
			description: `User ${user.firstName} ${user.lastName} (${user.cid}) has registered`,
			color: 0x5865f2,
			fields: [],
			footer: { text: null },
			timestamp: new Date().toISOString()
		});
	}

	await syncUserMembership(locals.db, user);

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, locals.db, {
		identityToken: accessToken,
		identityRoles: claims.roles,
		identityCheckedAt: Date.now()
	});
	setSessionTokenCookie(cookies, sessionToken, session.expiresAt);

	logger.info(`Identity login successful: CID ${user.cid} (${claims.name})`, {
		roles: claims.roles
	});

	// Only follow same-site paths
	const returnUrl = cookies.get('connect_return_url') ?? '/';
	cookies.delete('connect_return_url', { path: '/' });

	redirect(302, returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
}
