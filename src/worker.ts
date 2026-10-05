import { drizzle } from '$lib/server/db';
import { runProcessRoster } from '$lib/server/triggers/processRoster.js';
import { runRemindBookings } from '$lib/server/triggers/remindBookings.js';
import { setEnv } from '@indy-center/adapter-cloudflare/env-shim';
import sv from '../.svelte-kit/cloudflare/_worker.js';

export default {
	fetch: sv.fetch,

	async scheduled(event, env, _ctx) {
		setEnv(env as unknown as Record<string, string | undefined>);
		// Independent jobs, so one failing doesn't stop the other; failures still fail the run
		const results = await Promise.allSettled([
			runProcessRoster(drizzle(env.DB)),
			runRemindBookings(env.LARRY, new Date(event.scheduledTime))
		]);
		const errors = results.flatMap((result) =>
			result.status === 'rejected' ? [result.reason] : []
		);
		if (errors.length > 0) throw new AggregateError(errors, 'Scheduled job failed');
	}
} satisfies ExportedHandler<Env>;
