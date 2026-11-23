import type { User } from '$lib/db/schema/users';
import type { DiscordStep, TeamSpeakStep } from '$lib/profile/linkedAccounts';
import { readLinks, type LarryBinding, type Links } from '$lib/server/larry';

/**
 * Whether larry says the member's Discord account is in the server. larry 1.5.0 adds `inServer`;
 * an older larry leaves it out, read here as not known.
 */
function inServer(discord: Links['discord']): boolean {
	return (discord as { inServer?: boolean | null } | null)?.inServer === true;
}

/** The Discord join button's state: sign in first, join (link and be added), or open the server. */
export function discordStep(user: User | null, links: Links | null): DiscordStep {
	if (!user) return 'sign-in';
	return links && inServer(links.discord) ? 'open' : 'join';
}

/** The TeamSpeak tile's state: sign in first, connect (and get a link message), or linked. */
export function teamspeakStep(user: User | null, links: Links | null): TeamSpeakStep {
	if (!user) return 'sign-in';
	return links?.teamspeak ? 'linked' : 'connect';
}

/**
 * Both states for a visitor, asking larry only for a signed-in one. When larry can't be asked,
 * the member is offered Join and Connect, which work either way.
 */
export async function socialSteps(larry: LarryBinding | undefined, user: User | null) {
	const links = user ? await readLinks(larry, user.cid) : null;
	return { discord: discordStep(user, links), teamspeak: teamspeakStep(user, links) };
}
