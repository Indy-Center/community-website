import type { Links } from '@indy-center/indy-larry-worker';

/** Shown in the Linked accounts panel when larry can't be asked. */
export const LINKS_UNAVAILABLE = 'Links are unavailable right now.';

/** A bad or missing state, or a Discord sign-in that was cancelled or failed. */
export const DISCORD_NOT_CONFIRMED = "Discord didn't confirm the account. Try again.";

/** larry queued the member's role sync. */
export const SYNC_QUEUED = 'Your roles will update in a minute.';

/** What the card says once larry has linked the account, by whether it added them to the server. */
export function linkedMessage(username: string, joined: boolean) {
	return joined
		? `Linked as @${username}. You've been added to the Indy Center Discord.`
		: `Linked as @${username}. You were already in the Indy Center Discord.`;
}

/**
 * A message for the Linked accounts panel, carried over a redirect: after the Discord callback,
 * an unlink or a sync. `discord` is the account the callback just read from Discord, so the row
 * can show its username instead of the ID.
 */
export type AccountsFlash = {
	level: 'success' | 'info' | 'danger';
	message: string;
	discord?: { id: string; username: string };
};

/** The Discord row: the member's own link, VATUSA's account, or none. */
export type DiscordRow =
	| { state: 'linked'; account: string }
	| { state: 'vatusa' }
	| { state: 'none' };

/**
 * The Discord row for larry's `getLinks` answer. A linked account is shown as "@username" when
 * the callback just read that account from Discord, else by its ID.
 */
export function discordRow(
	discord: Links['discord'],
	justRead?: AccountsFlash['discord']
): DiscordRow {
	if (!discord) return { state: 'none' };
	if (discord.source === 'vatusa') return { state: 'vatusa' };
	return {
		state: 'linked',
		account: justRead?.id === discord.id ? `@${justRead.username}` : discord.id
	};
}
