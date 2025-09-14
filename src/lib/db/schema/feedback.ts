import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
