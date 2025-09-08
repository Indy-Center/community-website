import type { VatusaRosterMember } from '$lib/types/vatusa';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';
import { relations } from 'drizzle-orm';
import { userCertificationsTable } from './certifications';

export type VatsimController = typeof vatsimControllersTable.$inferSelect;

export const vatsimControllersTable = sqliteTable('vatsim_controllers', {
	cid: text('cid').primaryKey(),
	data: text('data', { mode: 'json' }).$type<VatusaRosterMember>().notNull()
});

export const vatsimControllersRelations = relations(vatsimControllersTable, ({ one, many }) => ({
	user: one(usersTable, {
		fields: [vatsimControllersTable.cid],
		references: [usersTable.cid]
	})
}));
