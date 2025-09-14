import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';

export const feedbackTable = sqliteTable('feedback', {
	id: text('id').primaryKey(),
	submitterId: text('submitter_id').notNull(),
	controllerId: text('controller_id').notNull(),
	rating: text('rating').notNull(),
	status: text('status').notNull(),
	position: text('position').notNull(),
	callsign: text('callsign'),
	feedback: text('feedback'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const feedbackRelations = relations(feedbackTable, ({ one }) => ({
	submitter: one(usersTable, {
		fields: [feedbackTable.submitterId],
		references: [usersTable.id]
	}),
	controller: one(usersTable, {
		fields: [feedbackTable.controllerId],
		references: [usersTable.id]
	})
}));
