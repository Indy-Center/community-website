import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';
import type { FeedbackEventType, FeedbackStatus, PublishMode } from '$lib/utils/feedbackReview';

export type { FeedbackEventType, FeedbackStatus, PublishMode };

export type Feedback = typeof feedbackTable.$inferSelect;
export type FeedbackEvent = typeof feedbackEventsTable.$inferSelect;

export const feedbackTable = sqliteTable('feedback', {
	id: text('id').primaryKey(),
	submitterId: text('submitter_id').notNull(),
	controllerId: text('controller_id').notNull(),
	rating: text('rating').notNull(),
	status: text('status').$type<FeedbackStatus>().notNull(),
	position: text('position').notNull(),
	callsign: text('callsign'),
	feedback: text('feedback'),
	// Reviewer working a follow up
	assigneeId: text('assignee_id'),
	// What gets published. Staff can edit these before publishing; the original submission
	// above is never changed.
	publishMode: text('publish_mode').$type<PublishMode>(),
	publishedAt: integer('published_at', { mode: 'timestamp' }),
	publishedRating: text('published_rating'),
	publishedPosition: text('published_position'),
	publishedCallsign: text('published_callsign'),
	publishedPilotName: text('published_pilot_name'),
	publishedFeedback: text('published_feedback'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

// The review log for each feedback item
export const feedbackEventsTable = sqliteTable('feedback_events', {
	id: text('id').primaryKey(),
	feedbackId: text('feedback_id').notNull(),
	userId: text('user_id').notNull(),
	type: text('type').$type<FeedbackEventType>().notNull(),
	// status: the new status, assigned: the assignee's user ID (null when unassigned),
	// published: the publish mode
	value: text('value'),
	// Comment or action text, or an optional note on a status change
	body: text('body'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const feedbackRelations = relations(feedbackTable, ({ one, many }) => ({
	submitter: one(usersTable, {
		fields: [feedbackTable.submitterId],
		references: [usersTable.id]
	}),
	controller: one(usersTable, {
		fields: [feedbackTable.controllerId],
		references: [usersTable.id]
	}),
	assignee: one(usersTable, {
		fields: [feedbackTable.assigneeId],
		references: [usersTable.id]
	}),
	events: many(feedbackEventsTable)
}));

export const feedbackEventRelations = relations(feedbackEventsTable, ({ one }) => ({
	feedback: one(feedbackTable, {
		fields: [feedbackEventsTable.feedbackId],
		references: [feedbackTable.id]
	}),
	user: one(usersTable, {
		fields: [feedbackEventsTable.userId],
		references: [usersTable.id]
	})
}));
