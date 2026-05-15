import { drizzle } from '$lib/server/db';
import { runProcessRoster } from '$lib/server/triggers/processRoster.js';
import { setEnv } from '@indy-center/adapter-cloudflare/env-shim';
import sv from '../.svelte-kit/cloudflare/_worker.js';

export default {
	fetch: sv.fetch,

	async scheduled(_event, env, _ctx) {
		setEnv(env as unknown as Record<string, string | undefined>);
		await runProcessRoster(drizzle(env.DB));
	}
} satisfies ExportedHandler<Env>;
