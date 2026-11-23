import { redirect, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { DISCORD_NOT_CONFIRMED, linkedMessage } from '$lib/profile/linkedAccounts';
import {
	DISCORD_STATE_COOKIE,
	discordClient,
	fetchDiscordUser,
	setAccountsFlash
} from '$lib/server/discordLink';
import { errorMessage } from '$lib/server/larry';
import { logger } from '$lib/server/logger';
import { signInHref } from '$lib/utils/signIn';

// Where Discord returns after Link Discord. The member's access token is passed to larry once,
// for the join, and is never stored or logged.
export async function GET({ locals, url, cookies, platform }: RequestEvent): Promise<Response> {
	if (!locals.user) {
		return redirect(302, signInHref(`${url.pathname}${url.search}`));
	}
	const { cid } = locals.user;

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get(DISCORD_STATE_COOKIE);
	cookies.delete(DISCORD_STATE_COOKIE, { path: '/profile/discord' });

	const notConfirmed = () => {
		setAccountsFlash(cookies, { level: 'danger', message: DISCORD_NOT_CONFIRMED });
		return redirect(302, '/profile');
	};

	// A cancelled sign-in comes back with `error` and no code
	if (!code || !state || state !== storedState) {
		logger.warn(`Discord callback for ${cid} with no code or a mismatched state`);
		return notConfirmed();
	}

	const client = discordClient(env, url.origin);
	if (!client) {
		logger.error("The Discord client isn't configured (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)");
		return notConfirmed();
	}

	let accessToken: string;
	let account: { id: string; username: string } | null;
	try {
		accessToken = (await client.validateAuthorizationCode(code, null)).accessToken();
		account = await fetchDiscordUser(accessToken);
	} catch (error) {
		logger.error(`Discord did not confirm the account of ${cid}`, errorMessage(error));
		return notConfirmed();
	}
	if (!account) {
		logger.error(`Discord would not say whose account ${cid} signed in with`);
		return notConfirmed();
	}

	const discord = { id: account.id, username: account.username };
	try {
		const larry = platform?.env.LARRY;
		if (!larry) throw new Error('The LARRY binding is not set');
		const { joined } = await larry.linkDiscord(Number(cid), account.id, accessToken);
		logger.info(`Linked Discord account ${account.id} to ${cid}`, { joined });
		setAccountsFlash(cookies, {
			level: 'success',
			message: linkedMessage(account.username, joined),
			discord
		});
	} catch (error) {
		logger.error(`Could not link Discord account ${account.id} to ${cid}`, errorMessage(error));
		setAccountsFlash(cookies, { level: 'danger', message: errorMessage(error), discord });
	}
	return redirect(302, '/profile');
}
