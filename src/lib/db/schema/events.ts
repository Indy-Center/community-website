import { relations, sql } from 'drizzle-orm';
import { sqliteTable, index } from 'drizzle-orm/sqlite-core';
import { text } from 'drizzle-orm/sqlite-core';
import { integer } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';

export type Event = typeof eventsTable.$inferSelect;

export const eventsTable = sqliteTable('events', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type').notNull(),
	rosterType: text('roster_type', { enum: ['open', 'assigned', 'none'] })
		.notNull()
		.default('none'),
	bannerUrl: text('banner_url'),
	description: text('description').notNull(),
	startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
	endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	isRosterPublished: integer('is_roster_published', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const eventPositionsTable = sqliteTable(
	'event_positions',
	{
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
		createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
	},
	(table) => [index('event_positions_event_id_position_idx').on(table.eventId, table.position)]
);

export type EventBriefing = typeof eventBriefingsTable.$inferSelect;

// The briefing posted to Discord for an event, kept so roster changes can edit the post
export const eventBriefingsTable = sqliteTable('event_briefings', {
	eventId: text('event_id').primaryKey(),
	text: text('text').notNull(),
	briefUrl: text('brief_url'),
	// The event's Discord role, which the post pings
	roleId: text('role_id'),
	// Larry's messages, in order: the briefing first, then any the roster overflowed into
	messageIds: text('message_ids', { mode: 'json' }).notNull().$type<string[]>(),
	sentAt: integer('sent_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type EventBookingProblem = typeof eventBookingProblemsTable.$inferSelect;

// A roster position the booking system couldn't book, cancel or move, for the events team to pass
// to the tech team. Cleared when that position next syncs, or when a manager dismisses it.
export const eventBookingProblemsTable = sqliteTable(
	'event_booking_problems',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id').notNull(),
		positionId: text('position_id').notNull(),
		// The position's callsign, when it could be worked out
		callsign: text('callsign'),
		cid: text('cid').notNull(),
		action: text('action', { enum: ['book', 'cancel', 'move'] }).notNull(),
		// What went wrong, as the booking system (or the site) put it
		message: text('message').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [index('event_booking_problems_event_id_idx').on(table.eventId)]
);

export const eventRelations = relations(eventsTable, ({ many }) => ({
	positions: many(eventPositionsTable),
	positionRequests: many(eventPositionRequestsTable)
}));

export const eventPositionRequestsTable = sqliteTable('event_position_requests', {
	id: text('id').primaryKey(),
	eventId: text('event_id').notNull(),
	userId: text('user_id').notNull(),
	comments: text('comments'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

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

export const eventPositionRequestRelations = relations(eventPositionRequestsTable, ({ one }) => ({
	event: one(eventsTable, {
		fields: [eventPositionRequestsTable.eventId],
		references: [eventsTable.id]
	}),
	user: one(usersTable, {
		fields: [eventPositionRequestsTable.userId],
		references: [usersTable.id]
	})
}));
