import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';

// Endorsements for Solo and T2 Center
export const userEndorsementsTable = sqliteTable('user_endorsements', {
	userId: text('user_id').notNull(),
	endorsement: text('endorsement').notNull(),
	// 6 months from when it was created, and then every batch interval we bump it if they're still on the roster.
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	expiresAt: integer('expires_at', { mode: 'timestamp' })
});

export const endorsementRelations = relations(userEndorsementsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userEndorsementsTable.userId],
		references: [usersTable.id]
	})
}));
