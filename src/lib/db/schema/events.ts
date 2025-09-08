import { relations, sql } from 'drizzle-orm';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { text } from 'drizzle-orm/sqlite-core';
import { integer } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';

export const eventsTable = sqliteTable('events', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type').notNull(),
	rosterType: text('roster_type', { enum: ['open', 'assigned', 'none'] })
		.notNull()
		.default('none'),
	bannerUrl: text('banner_url').notNull(),
	description: text('description').notNull(),
	startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
	endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const eventPositionsTable = sqliteTable('event_positions', {
	eventId: text('event_id').notNull(),
	position: text('position').notNull(),
	userId: text('filled_by_user_id'),
	requiredCertifications: text('required_certifications', { mode: 'json' })
		.notNull()
		.default(sql`'[]'`)
		.$type<string[]>(),
	requiredEndorsements: text('required_endorsements', { mode: 'json' })
		.notNull()
		.default(sql`'[]'`)
		.$type<string[]>(),
	opensAt: integer('opens_at', { mode: 'timestamp' }).notNull(),
	closesAt: integer('closes_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const eventRelations = relations(eventsTable, ({ many }) => ({
	positions: many(eventPositionsTable)
}));

export const eventPositionRelations = relations(eventPositionsTable, ({ one }) => ({
	event: one(eventsTable, {
		fields: [eventPositionsTable.eventId],
		references: [eventsTable.id]
	}),
	user: one(usersTable, {
		fields: [eventPositionsTable.userId],
		references: [usersTable.id]
	})
}));
