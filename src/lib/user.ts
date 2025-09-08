import { userRolesTable, usersTable } from '$lib/db/schema';

export type User = typeof usersTable.$inferSelect;

export type Role = typeof userRolesTable.$inferSelect;

export type CreateUserParams = typeof usersTable.$inferInsert;

export type UserWithRelations = User & {
	roles: Role[];
};

export function hasRole(user: UserWithRelations, role: string): boolean {
	return user.roles.some((r) => r.role === role);
}

export function hasAnyRole(user: UserWithRelations, roles: string[]): boolean {
	return user.roles.some((r) => roles.includes(r.role));
}

export function hasAllRoles(user: UserWithRelations, roles: string[]): boolean {
	return roles.every((role) => user.roles.some((r) => r.role === role));
}
