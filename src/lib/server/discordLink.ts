import type { Cookies } from '@sveltejs/kit';
import { toastFromServer } from '@indy-center/centerline-svelte';
import { Discord } from 'arctic';
import { z } from 'zod';
import type { AccountsFlash } from '$lib/profile/linkedAccounts';

export const DISCORD_CALLBACK_PATH = '/profile/discord/callback';

/** Holds the Discord sign-in's state between Link Discord and the callback. */
export const DISCORD_STATE_COOKIE = 'discord_oauth_state';

/** `identify` for the account's ID and name, `guilds.join` so larry can add them to the server. */
export const DISCORD_SCOPES = ['identify', 'guilds.join'];

/** The settings it reads: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET. */
export type DiscordEnv = Record<string, string | undefined>;

/** The "Indy Center" Discord app's OAuth client, or null when it isn't configured. */
export function discordClient(env: DiscordEnv, origin: string) {
	if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) return null;
	return new Discord(
		env.DISCORD_CLIENT_ID,
		env.DISCORD_CLIENT_SECRET,
		`${origin}${DISCORD_CALLBACK_PATH}`
	);
}

const DiscordUserSchema = z.object({ id: z.string(), username: z.string() });

/** The Discord account behind a member's access token (`/users/@me`), or null if Discord refuses. */
export async function fetchDiscordUser(accessToken: string) {
	const response = await fetch('https://discord.com/api/v10/users/@me', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!response.ok) return null;
	const user = DiscordUserSchema.safeParse(await response.json());
	return user.success ? user.data : null;
}

// Carries the Discord account the callback just read to /profile, so the row can show its name
const FLASH_COOKIE = 'profile_accounts';

/**
 * Says how a Linked accounts button went, over the redirect back to /profile, as a Centerline
 * toast: a success, a note ("Your roles will update in a minute.") or a failure (`danger`, larry's
 * refusal as it comes). Each is the result of an action just taken, and the row already shows
 * what changed, so nothing stays on the panel. `discord` goes to the panel, so the row can show
 * the username.
 */
export function setAccountsFlash(cookies: Cookies, flash: AccountsFlash) {
	const { discord, level, message } = flash;
	toastFromServer(cookies, level, message);
	if (!discord) return;
	cookies.set(FLASH_COOKIE, JSON.stringify({ discord }), {
		path: '/profile',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60
	});
}

const FlashSchema = z.object({
	discord: z.object({ id: z.string(), username: z.string() })
});

/** What the panel keeps after a redirect: the Discord account just read. */
export type PanelFlash = z.infer<typeof FlashSchema>;

/** The panel's flash, once: reading it clears it. */
export function takeAccountsFlash(cookies: Cookies): PanelFlash | null {
	const value = cookies.get(FLASH_COOKIE);
	if (!value) return null;
	cookies.delete(FLASH_COOKIE, { path: '/profile' });
	try {
		const flash = FlashSchema.safeParse(JSON.parse(value));
		return flash.success ? flash.data : null;
	} catch {
		return null;
	}
}
