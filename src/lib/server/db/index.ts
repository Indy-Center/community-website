import { drizzle as drizzleFactory } from 'drizzle-orm/d1';
import * as schema from '$lib/db/schema';

export function drizzle(db: D1Database) {
	return drizzleFactory(db, { schema });
}

// Export the properly typed database instance
export type Database = ReturnType<typeof drizzle>;

// Re-export schema for convenience
export * from '$lib/db/schema';
