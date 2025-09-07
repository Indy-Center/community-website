// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Database } from '$lib/server/db';
import type { Session, User } from '$lib/server/session';
import type { VatsimUserData } from '$lib/server/vatsim/vatsimConnectClient';

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
			user?: User;
			session?: Session;
			userVatsimData?: VatsimUserData;
			userRoles?: string[];
		}
	}
}

export {};
