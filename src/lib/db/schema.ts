import type { VatusaRosterMember } from '$lib/types/vatusa';
import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const vatsimControllersTable = sqliteTable('vatsim_controllers', {
	cid: text('cid').primaryKey(),
	data: text('data', { mode: 'json' }).$type<VatusaRosterMember>().notNull()
});

// Roles for Application Functionality
export const userRolesTable = sqliteTable('user_roles', {
	userId: text('user_id').notNull(),
	role: text('role').notNull()
});

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

// Endorsements for Solo and T2 Center
export const userEndorsementsTable = sqliteTable('user_endorsements', {
	userId: text('user_id').notNull(),
	endorsement: text('endorsement').notNull(),
	// 6 months from when it was created, and then every batch interval we bump it if they're still on the roster.
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	expiresAt: integer('expires_at', { mode: 'timestamp' })
});

// This is data that originally comes from VATSIM Connect, but is overridable by the User
export const usersTable = sqliteTable('users', {
	id: text('id').primaryKey(),
	cid: text('cid').notNull(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull(),
	preferredName: text('preferred_name'),
	pronouns: text('pronouns'),
	membership: text('membership', { enum: ['basic', 'community', 'controller'] }).notNull()
});

export const userSessionsTable = sqliteTable('user_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

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
	eventPositions: many(eventPositionsTable)
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

export const userRelations = relations(usersTable, ({ many, one }) => ({
	controller: one(vatsimControllersTable, {
		fields: [usersTable.cid],
		references: [vatsimControllersTable.cid]
	}),
	certifications: many(userCertificationsTable),
	endorsements: many(userEndorsementsTable),
	roles: many(userRolesTable),
	eventPositions: many(eventPositionsTable)
}));

export const certificationRelations = relations(userCertificationsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userCertificationsTable.userId],
		references: [usersTable.id]
	})
}));

export const roleRelations = relations(userRolesTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userRolesTable.userId],
		references: [usersTable.id]
	})
}));

export const endorsementRelations = relations(userEndorsementsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userEndorsementsTable.userId],
		references: [usersTable.id]
	})
}));
