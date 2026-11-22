// A stand-in for Larry's Worker, for local development only: run it beside the site and the
// site's `LARRY` binding reaches it. It posts nothing to Discord; it prints each message it is
// asked to send or queue and answers as Larry would. Like Larry, it refuses a channel name it
// doesn't know.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type { ChannelSend, Sent } from '@indy-center/indy-larry-worker';

// The SEND_CHANNELS names the site uses
const CHANNELS = ['events-team', 'senior-staff-alerts', 'feedback'];

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

	async fetch() {
		return new Response('Fake indy-larry Worker: call it over its binding.');
	}
}
