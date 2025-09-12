// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Database } from '$lib/server/db';
import type { Session } from '$lib/server/session';
import type { UserWithRelations } from '$lib/user';

// for information about these interfaces
declare global {
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
