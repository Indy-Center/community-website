import { drizzle as drizzleFactory } from 'drizzle-orm/d1';

// Dynamically import all schema files
const schemaModules = import.meta.glob('$lib/db/schema/*.ts', { eager: true });
const schema: Record<string, any> = {};

// Combine all schema exports into a single object
Object.values(schemaModules).forEach((module: any) => {
	Object.keys(module).forEach((exportName) => {
		if (exportName !== 'default') {
			schema[exportName] = module[exportName];
		}
	});
});

// Export the properly typed database instance
export type Database = ReturnType<typeof drizzle>;

// Create a drizzle instance
export function drizzle(db: D1Database) {
	return drizzleFactory(db, { schema });
}
