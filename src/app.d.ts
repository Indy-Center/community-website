// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Cms } from '$lib/server/cms';
import type { Database } from '$lib/server/db';
import type { Session } from '$lib/server/session';
import type { UserWithRelations } from '$lib/user';

// for information about these interfaces
declare global {
	namespace Cloudflare {
		interface Env {
			DB: D1Database;
			/**
			 * The CMS's server credential for the partners document, sent as
			 * `Authorization: Bearer <token>` to CMS_URL. Set with
			 * `wrangler secret put COMMUNITY_API_TOKEN`. Without it every read from the CMS fails,
			 * and only copies already kept are served.
			 */
			COMMUNITY_API_TOKEN?: string;
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
