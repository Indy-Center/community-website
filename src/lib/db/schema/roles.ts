import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';
import { relations, type InferSelectModel } from 'drizzle-orm';

export type UserRole = InferSelectModel<typeof userRolesTable>;

// Roles for Application Functionality
export const userRolesTable = sqliteTable('user_roles', {
	userId: text('user_id').notNull(),
	role: text('role').notNull()
});

export const roleRelations = relations(userRolesTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userRolesTable.userId],
		references: [usersTable.id]
	})
}));
