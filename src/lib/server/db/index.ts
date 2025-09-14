import { drizzle as drizzleFactory } from 'drizzle-orm/d1';
import * as users from '$lib/db/schema/users';
import * as certifications from '$lib/db/schema/certifications';
import * as events from '$lib/db/schema/events';
import * as endorsements from '$lib/db/schema/endorsements';
import * as vatsimControllers from '$lib/db/schema/vatsimControllers';
import * as roles from '$lib/db/schema/roles';
import * as feedback from '$lib/db/schema/feedback';

// Properly typed schema object
const schema = {
	...users,
	...certifications,
	...events,
	...endorsements,
	...vatsimControllers,
	...roles,
	...feedback
};

// Export the properly typed database instance
export type Database = ReturnType<typeof drizzle>;

// Create a drizzle instance
export function drizzle(db: D1Database) {
	return drizzleFactory(db, { schema });
}
