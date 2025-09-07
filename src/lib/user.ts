import { usersTable } from '$lib/db/schema';

export type User = typeof usersTable.$inferSelect;

export type CreateUserParams = typeof usersTable.$inferInsert;
