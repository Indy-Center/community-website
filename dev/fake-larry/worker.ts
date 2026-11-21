// A stand-in for Larry's Worker, for local development only: run it beside the site and the
// site's `LARRY` binding reaches it. It posts nothing to Discord; it prints each message it is
// asked to send and answers as Larry would. Like Larry, it refuses a channel name it doesn't know.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type { ChannelSend, Sent } from '@indy-center/indy-larry-worker';

// The SEND_CHANNELS names the site uses
const CHANNELS = ['beta-testing'];

export default class FakeLarry extends WorkerEntrypoint {
	async send(request: ChannelSend): Promise<Sent> {
		if (!CHANNELS.includes(request.channel)) {
			throw new Error(`Unknown channel "${request.channel}"`);
		}
		console.log(`Larry would post to #${request.channel}:\n${JSON.stringify(request, null, 2)}`);
		return { channelId: '0', messageId: String(Date.now()) };
	}

	async fetch() {
		return new Response('Fake indy-larry Worker: call it over its binding.');
	}
}
