// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Database } from '$lib/server/db';
import type { Session } from '$lib/server/session';
import type { UserWithRelations } from '$lib/user';

// for information about these interfaces
declare global {
	namespace Cloudflare {
		interface Env {
			DB: D1Database;
			// Indy Larry's send Worker (Indy-Center/indy-larry, worker/); only the call we make is typed
			LARRY?: {
				enqueueDirect(request: { userId: string; embeds: object[] }): Promise<void>;
			};
		}
	}
	namespace App {
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
		interface Locals {
			db: Database;
			user?: UserWithRelations;
			session?: Session;
			roles: string[];
		}
	}
}

export {};
