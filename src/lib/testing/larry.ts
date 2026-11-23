import type { Links, SyncMembersResult } from '@indy-center/indy-larry-worker';

/**
 * A fake LARRY binding for route tests: what it was asked, and how it answers. `links: Error`
 * makes `getLinks` throw, as an unreachable larry would; `link` and `unlink` likewise, with
 * larry's refusal as the error's message.
 */
export function fakeLarry(
	opts: {
		discord?: Links['discord'];
		links?: Error;
		sync?: SyncMembersResult | Error;
		link?: { joined: boolean } | Error;
		unlink?: Error;
	} = {}
) {
	const synced: number[][] = [];
	const linked: { cid: number; discordId: string; accessToken?: string }[] = [];
	const unlinked: { cid: number; service: 'discord' | 'teamspeak' }[] = [];
	return {
		synced,
		linked,
		unlinked,
		getLinks: async (): Promise<Links> => {
			if (opts.links) throw opts.links;
			return {
				discord:
					opts.discord === undefined
						? { id: '100000000000000001', source: 'vatusa' }
						: opts.discord,
				teamspeak: null
			};
		},
		syncMembers: async (cids: number[]): Promise<SyncMembersResult> => {
			synced.push(cids);
			if (opts.sync instanceof Error) throw opts.sync;
			return opts.sync ?? cids.map((cid) => ({ cid, queued: true as const }));
		},
		linkDiscord: async (cid: number, discordId: string, accessToken?: string) => {
			linked.push({ cid, discordId, accessToken });
			if (opts.link instanceof Error) throw opts.link;
			return opts.link ?? { joined: true };
		},
		unlink: async (cid: number, service: 'discord' | 'teamspeak') => {
			unlinked.push({ cid, service });
			if (opts.unlink) throw opts.unlink;
		}
	};
}

export type FakeLarry = ReturnType<typeof fakeLarry>;
