import type { VatusaRosterMember } from '$lib/types/vatusa';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export type VatsimController = typeof vatsimControllersTable.$inferSelect;

export const vatsimControllersTable = sqliteTable('vatsim_controllers', {
	cid: text('cid').primaryKey(),
	data: text('data', { mode: 'json' }).$type<VatusaRosterMember>().notNull()
});
