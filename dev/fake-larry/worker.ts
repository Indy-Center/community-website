// A stand-in for Larry's Worker, for local development only: run it beside the site and the
// site's `LARRY` binding reaches it. It posts nothing to Discord; it prints each message it is
// asked to send or queue and answers as Larry would. Like Larry, it refuses a channel name it
// doesn't know.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type { ChannelSend, Links, Sent, SyncMembersResult } from '@indy-center/indy-larry-worker';

// The SEND_CHANNELS names the site uses
const CHANNELS = ['events-team', 'senior-staff-alerts', 'controller-feedback'];

const SYNC_COOLDOWN_MS = 2 * 60 * 1000;
const lastSynced = new Map<number, number>();

function check(request: ChannelSend) {
	if (!CHANNELS.includes(request.channel)) {
		throw new Error(`Unknown channel "${request.channel}"`);
	}
}

export default class FakeLarry extends WorkerEntrypoint {
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

	// Every member has a Discord account known from VATUSA here, and nothing linked
	async getLinks(cid: number): Promise<Links> {
		console.log(`Larry would look up the links of ${cid}`);
		return { discord: { id: '100000000000000001', source: 'vatusa' }, teamspeak: null };
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
