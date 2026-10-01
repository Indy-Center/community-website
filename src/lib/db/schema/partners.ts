import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// Relative so drizzle-kit can resolve it ($lib only works inside SvelteKit)
import { PARTNER_CATEGORY_KEYS } from '../../config/partners';

export type Partner = typeof partnersTable.$inferSelect;
export type PartnerLink = { label: string; url: string };

export const partnersTable = sqliteTable('partners', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	category: text('category', { enum: PARTNER_CATEGORY_KEYS }).notNull(),
	logoUrl: text('logo_url'),
	description: text('description').notNull(),
	links: text('links', { mode: 'json' })
		.notNull()
		.default(sql`'[]'`)
		.$type<PartnerLink[]>(),
	sortOrder: integer('sort_order').notNull().default(0),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});
