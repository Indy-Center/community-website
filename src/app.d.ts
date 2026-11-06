// See https://svelte.dev/docs/kit/types#app.d.ts

import type { LarryBinding } from '@indy-center/indy-larry-worker';
import type { TrainingBinding } from '@indy-center/training-tools';
import type { Cms } from '$lib/server/cms';
import type { Database } from '$lib/server/db';
import type { Session } from '$lib/server/session';
import type { BookingsWorker } from '$lib/types/bookings';
import type { UserWithRelations } from '$lib/user';

// for information about these interfaces
declare global {
	namespace Cloudflare {
		interface Env {
			DB: D1Database;
			/** The training app's `TrainingRpc` entrypoint: the controller roster; see the README. */
			TRAINING: TrainingBinding;
			/** Larry's Worker, which posts Discord messages as the bot; see the README. */
			LARRY: LarryBinding;
			/** The CMS's server credential; see the README. */
			COMMUNITY_API_TOKEN?: string;
			/** The bookings Worker (Indy-Center/bookings-worker), which wraps the booking system. */
			BOOKINGS?: BookingsWorker;
		}
	}
	namespace App {
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
			// The adapter declares this against @cloudflare/workers-types; restated here so it
			// type-checks. Optional, because `vite dev` may run without it.
			caches?: CacheStorage & { default: Cache };
		}
		interface Locals {
			db: Database;
			user?: UserWithRelations;
			session?: Session;
			roles: string[];
			/** The CMS client, which reads the partners document and keeps a copy of it. */
			cms: Cms;
		}
	}
}

export {};
