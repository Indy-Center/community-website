import { bookingsApiFromEnv, cacheApiReadStore } from '$lib/server/bookingsApi';
import { drizzle } from '$lib/server/db';
import { runProcessRoster } from '$lib/server/triggers/processRoster.js';
import { runRemindBookings } from '$lib/server/triggers/remindBookings.js';
import { setEnv } from '@indy-center/adapter-cloudflare/env-shim';
import sv from '../.svelte-kit/cloudflare/_worker.js';

export default {
	fetch: sv.fetch,

	async scheduled(event, env, _ctx) {
		setEnv(env as unknown as Record<string, string | undefined>);
		const bookings = bookingsApiFromEnv(
			env as unknown as Record<string, string | undefined>,
			// Workers' CacheStorage has a default cache that the DOM's type doesn't know about
			cacheApiReadStore((caches as unknown as { default: Cache }).default)
		);
		// Independent jobs, so one failing doesn't stop the other; failures still fail the run
		const results = await Promise.allSettled([
			runProcessRoster({
				training: env.TRAINING,
				db: drizzle(env.DB),
				bookings,
				t2RestrictionId: env.VATSIM_BOOKING_T2_RESTRICTION_ID
			}),
			runRemindBookings(env.LARRY, bookings, new Date(event.scheduledTime))
		]);
		const errors = results.flatMap((result) =>
			result.status === 'rejected' ? [result.reason] : []
		);
		if (errors.length > 0) throw new AggregateError(errors, 'Scheduled job failed');
	}
} satisfies ExportedHandler<Cloudflare.Env>;
