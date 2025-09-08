import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { eventPositionsTable } from './events';
import { userCertificationsTable } from './certifications';
import { userEndorsementsTable } from './endorsements';
import { userRolesTable } from './roles';
import { vatsimControllersTable } from './vatsimControllers';
import type { VatsimUserData } from '$lib/types/vatsim';

export type User = InferSelectModel<typeof usersTable>;
export type InsertUser = InferInsertModel<typeof usersTable>;

// This is data that originally comes from VATSIM Connect, but is overridable by the User
export const usersTable = sqliteTable('users', {
	id: text('id').primaryKey(),
	cid: text('cid').notNull(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull(),
	preferredName: text('preferred_name'),
	pronouns: text('pronouns'),
	membership: text('membership', { enum: ['basic', 'community', 'controller'] }).notNull(),
	operatingInitials: text('operating_initials'),
	data: text('data', { mode: 'json' }).$type<VatsimUserData>().notNull()
});

export const userSessionsTable = sqliteTable('user_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

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
