import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';

export const userCertificationsTable = sqliteTable(
	'user_certifications',
	{
		userId: text('user_id').notNull(),
		certification: text('certification').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
		// 6 months from when it was created, and then every batch interval we bump it if they're still on the roster.
		expiresAt: integer('expires_at', { mode: 'timestamp' })
	},
	(table) => [uniqueIndex('unique_certification').on(table.userId, table.certification)]
);

export const certificationRelations = relations(userCertificationsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userCertificationsTable.userId],
		references: [usersTable.id]
	})
}));
