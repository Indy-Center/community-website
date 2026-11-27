import type {
	ChannelEdit,
	ChannelSend,
	DeleteRequest,
	DeleteResult,
	Links,
	MessageRef,
	RolesResult,
	RolesSync,
	SyncMembersResult
} from '@indy-center/indy-larry-worker';

/**
 * A fake LARRY binding for route tests: what it was asked, and how it answers. `links: Error`
 * makes `getLinks` throw, as an unreachable larry would; `link` and `unlink` likewise, with
 * larry's refusal as the error's message. `discordByCid` answers `getLinks` per member instead.
 * Posts (`send`) get IDs `message-1`, `message-2`…; `roles: Error` makes `syncRoles` throw, and
 * `postError` makes `send` and `editMessage` throw, and `deleteRoles` is the refusal
 * `deleteRoles` reports for each role.
 */
export function fakeLarry(
	opts: {
		discord?: Links['discord'];
		links?: Error;
		sync?: SyncMembersResult | Error;
		link?: { joined: boolean } | Error;
		unlink?: Error;
		teamspeak?: Links['teamspeak'];
		confirmTs?: Error;
		discordByCid?: Record<number, Links['discord']>;
		roles?: Error;
		postError?: Error;
		deleteRoles?: DeleteResult['deleted'][number]['error'];
	} = {}
) {
	const roleSyncs: RolesSync[] = [];
	const sent: ChannelSend[] = [];
	const edited: (ChannelEdit & { queued: boolean })[] = [];
	const deleted: (MessageRef & { queued: boolean })[] = [];
	const deletedRoles: string[][] = [];
	const synced: number[][] = [];
	const linked: { cid: number; discordId: string; accessToken?: string }[] = [];
	const confirmed: { cid: number; token: string }[] = [];
	const unlinked: { cid: number; service: 'discord' | 'teamspeak' }[] = [];
	return {
		synced,
		linked,
		unlinked,
		roleSyncs,
		sent,
		edited,
		deleted,
		deletedRoles,
		getLinks: async (cid: number): Promise<Links> => {
			if (opts.links) throw opts.links;
			return {
				discord: opts.discordByCid
					? (opts.discordByCid[cid] ?? null)
					: opts.discord === undefined
						? { id: '100000000000000001', source: 'vatusa' }
						: opts.discord,
				teamspeak: opts.teamspeak ?? null
			};
		},
		confirmed,
		confirmTsLink: async (cid: number, token: string) => {
			confirmed.push({ cid, token });
			if (opts.confirmTs) throw opts.confirmTs;
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
		},
		syncRoles: async (request: RolesSync): Promise<RolesResult> => {
			roleSyncs.push(request);
			if (opts.roles) throw opts.roles;
			return {
				dryRun: false,
				canSeeMembers: true,
				roles: request.roles.map((role) => ({
					key: role.key,
					roleId: role.id ?? '900000000000000001',
					role: role.id ? 'found' : 'created',
					added: role.members,
					removed: [],
					notInServer: []
				}))
			};
		},
		send: async (message: ChannelSend) => {
			if (opts.postError) throw opts.postError;
			sent.push(message);
			return { channelId: 'channel-1', messageId: `message-${sent.length}` };
		},
		editMessage: async (edit: ChannelEdit) => {
			if (opts.postError) throw opts.postError;
			edited.push({ ...edit, queued: false });
			return { channelId: 'channel-1', messageId: edit.messageId };
		},
		enqueueEdit: async (edit: ChannelEdit) => {
			edited.push({ ...edit, queued: true });
		},
		deleteMessage: async (ref: MessageRef) => {
			deleted.push({ ...ref, queued: false });
		},
		enqueueDelete: async (ref: MessageRef) => {
			deleted.push({ ...ref, queued: true });
		},
		deleteRoles: async (request: DeleteRequest): Promise<DeleteResult> => {
			deletedRoles.push(request.ids);
			return {
				dryRun: false,
				deleted: request.ids.map((id) => ({
					id,
					outcome: 'deleted' as const,
					...(opts.deleteRoles ? { error: opts.deleteRoles } : {})
				}))
			};
		}
	};
}

export type FakeLarry = ReturnType<typeof fakeLarry>;
