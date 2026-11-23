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

// Carries the Linked accounts panel's failure, and the Discord account just read, to /profile
const FLASH_COOKIE = 'profile_accounts';

/**
 * Says how a Linked accounts button went, over the redirect back to /profile. A success or a
 * note ("Your roles will update in a minute.") is a Centerline toast; a failure, which the member
 * must read and may need to act on, stays on the panel as an Alert. `discord` always goes to the
 * panel, so the row can show the username.
 */
export function setAccountsFlash(cookies: Cookies, flash: AccountsFlash) {
	const { discord, level, message } = flash;
	const onPanel = level === 'danger';
	if (!onPanel) toastFromServer(cookies, level, message);
	if (!onPanel && !discord) return;
	cookies.set(
		FLASH_COOKIE,
		JSON.stringify({ ...(onPanel ? { level, message } : {}), ...(discord ? { discord } : {}) }),
		{ path: '/profile', httpOnly: true, sameSite: 'lax', maxAge: 60 }
	);
}

const FlashSchema = z.object({
	level: z.literal('danger').optional(),
	message: z.string().optional(),
	discord: z.object({ id: z.string(), username: z.string() }).optional()
});

/** What the panel shows after a redirect: a failure, and the Discord account just read. */
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
