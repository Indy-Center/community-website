// A stand-in for Larry's Worker, for local development only: run it beside the site and the
// site's `LARRY` binding reaches it. It posts nothing to Discord; it prints each message it is
// asked to send or queue and answers as Larry would. Like Larry, it refuses a channel name it
// doesn't know.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type {
	ChannelSend,
	LarryRpc,
	Links,
	Sent,
	SyncMembersResult
} from '@indy-center/indy-larry-worker';

// The SEND_CHANNELS names the site uses
const CHANNELS = ['events-team', 'senior-staff-alerts', 'controller-feedback'];

const SYNC_COOLDOWN_MS = 2 * 60 * 1000;
const lastSynced = new Map<number, number>();

// Discord accounts linked here, by CID, until the fake restarts; and those it has "added" to
// the server, so linking one again answers `joined: false`
const linkedDiscord = new Map<number, string>();
const inServer = new Set<string>();
// TeamSpeak identities linked here, by CID
const linkedTs = new Map<number, string>();

function check(request: ChannelSend) {
	if (!CHANNELS.includes(request.channel)) {
		throw new Error(`Unknown channel "${request.channel}"`);
	}
}

// The methods the site calls, with the installed package's types
type CalledBySite = Pick<
	LarryRpc,
	'send' | 'enqueue' | 'getLinks' | 'syncMembers' | 'linkDiscord' | 'confirmTsLink' | 'unlink'
>;

export default class FakeLarry extends WorkerEntrypoint implements CalledBySite {
	async send(request: ChannelSend): Promise<Sent> {
		check(request);
		console.log(`Larry would post to #${request.channel}:\n${JSON.stringify(request, null, 2)}`);
		return { channelId: '0', messageId: String(Date.now()) };
	}

	// Larry checks the message when it's queued; delivery happens later, so nothing comes back
	async enqueue(request: ChannelSend): Promise<void> {
		check(request);
		console.log(`Larry would queue for #${request.channel}:\n${JSON.stringify(request, null, 2)}`);
	}

	// A member's own link if they made one here, else a Discord account known from VATUSA
	async getLinks(cid: number): Promise<Links> {
		console.log(`Larry would look up the links of ${cid}`);
		const linked = linkedDiscord.get(cid);
		return {
			discord: linked
				? { id: linked, source: 'linked' }
				: { id: '100000000000000001', source: 'vatusa' },
			teamspeak: linkedTs.has(cid) ? { uid: linkedTs.get(cid)! } : null
		};
	}

	// Any token links a made-up identity, except "used" and "taken", which refuse as Larry does
	async confirmTsLink(cid: number, token: string): Promise<void> {
		if (token === 'used') {
			throw new Error(
				"This link has expired or was already used. Reconnect to TeamSpeak and we'll send you a new one."
			);
		}
		if (token === 'taken') throw new Error('That TeamSpeak identity is linked to another member.');
		linkedTs.set(cid, 'x7KqFakeIdentityUidForDev3dE=');
		console.log(`Larry would link a TeamSpeak identity to ${cid}`);
	}

	// Like Larry, refuses an account another member holds; "adds" an account to the server the
	// first time it is linked with a token
	async linkDiscord(
		cid: number,
		discordId: string,
		accessToken?: string
	): Promise<{ joined: boolean }> {
		for (const [other, id] of linkedDiscord) {
			if (id === discordId && other !== cid) {
				throw new Error('That Discord account is linked to another member.');
			}
		}
		linkedDiscord.set(cid, discordId);
		const joined = !!accessToken && !inServer.has(discordId);
		inServer.add(discordId);
		console.log(`Larry would link Discord ${discordId} to ${cid}`, { joined });
		return { joined };
	}

	async unlink(cid: number, service: 'discord' | 'teamspeak'): Promise<void> {
		if (service === 'discord') linkedDiscord.delete(cid);
		else linkedTs.delete(cid);
		console.log(`Larry would unlink the ${service} account of ${cid}`);
	}

	// Like Larry, declines a CID synced in the last 2 minutes
	async syncMembers(cids: number[]): Promise<SyncMembersResult> {
		const now = Date.now();
		return cids.map((cid) => {
			if (now - (lastSynced.get(cid) ?? 0) < SYNC_COOLDOWN_MS) {
				console.log(`Larry would decline to sync ${cid}: synced in the last 2 minutes`);
				return { cid, queued: false, reason: 'Synced in the last 2 minutes.' };
			}
			lastSynced.set(cid, now);
			console.log(`Larry would queue a role and nickname sync for ${cid}`);
			return { cid, queued: true };
		});
	}

	async fetch() {
		return new Response('Fake indy-larry Worker: call it over its binding.');
	}
}
