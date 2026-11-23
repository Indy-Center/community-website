import { redirect, type RequestEvent } from '@sveltejs/kit';
import { generateState } from 'arctic';
import { env } from '$env/dynamic/private';
import { DISCORD_NOT_CONFIRMED, joinDiscordHref } from '$lib/profile/linkedAccounts';
import {
	DEFAULT_RETURN,
	DISCORD_RETURN_COOKIE,
	DISCORD_SCOPES,
	DISCORD_STATE_COOKIE,
	discordClient,
	safeReturnPath,
	setAccountsFlash
} from '$lib/server/discordLink';
import { logger } from '$lib/server/logger';
import { signInHref } from '$lib/utils/signIn';

// Link Discord (and Use a different account): the Discord sign-in, returning to the callback.
// `?return=` names the page it was started from (the socials page, the home page), which the
// callback goes back to; without it, the profile.
export function GET({ locals, url, cookies }: RequestEvent): Response {
	const returnTo = safeReturnPath(url.searchParams.get('return'));

	if (!locals.user) {
		// Signed in, they come straight back here and on to Discord
		return redirect(302, signInHref(returnTo ? joinDiscordHref(returnTo) : DEFAULT_RETURN));
	}

	const client = discordClient(env, url.origin);
	if (!client) {
		logger.error("The Discord client isn't configured (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)");
		setAccountsFlash(cookies, { level: 'danger', message: DISCORD_NOT_CONFIRMED });
		return redirect(302, returnTo ?? DEFAULT_RETURN);
	}

	const cookie = {
		path: '/profile/discord',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	} as const;
	const state = generateState();
	cookies.set(DISCORD_STATE_COOKIE, state, cookie);
	if (returnTo) cookies.set(DISCORD_RETURN_COOKIE, returnTo, cookie);
	else cookies.delete(DISCORD_RETURN_COOKIE, { path: '/profile/discord' });
	return redirect(302, client.createAuthorizationURL(state, null, DISCORD_SCOPES).toString());
}
