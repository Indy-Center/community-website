import { redirect, type RequestEvent } from '@sveltejs/kit';
import { generateState } from 'arctic';
import { env } from '$env/dynamic/private';
import { DISCORD_NOT_CONFIRMED } from '$lib/profile/linkedAccounts';
import {
	DISCORD_SCOPES,
	DISCORD_STATE_COOKIE,
	discordClient,
	setAccountsFlash
} from '$lib/server/discordLink';
import { logger } from '$lib/server/logger';
import { signInHref } from '$lib/utils/signIn';

// Link Discord (and Use a different account): the Discord sign-in, returning to the callback
export function GET({ locals, url, cookies }: RequestEvent): Response {
	if (!locals.user) {
		return redirect(302, signInHref('/profile'));
	}

	const client = discordClient(env, url.origin);
	if (!client) {
		logger.error("The Discord client isn't configured (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)");
		setAccountsFlash(cookies, { level: 'danger', message: DISCORD_NOT_CONFIRMED });
		return redirect(302, '/profile');
	}

	const state = generateState();
	cookies.set(DISCORD_STATE_COOKIE, state, {
		path: '/profile/discord',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	});
	return redirect(302, client.createAuthorizationURL(state, null, DISCORD_SCOPES).toString());
}
