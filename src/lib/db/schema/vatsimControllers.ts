import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';
import { relations } from 'drizzle-orm';
import { userCertificationsTable } from './certifications';

export type VatsimController = typeof vatsimControllersTable.$inferSelect;

/**
 * The site's copy of the controller roster, as the training app's `getRoster()` last answered it,
 * keyed by CID. Replaced whole by the roster refresh (`src/lib/server/roster.ts`).
 *
 * `lastName` is held even when `namePrivacy` is set; never show it publicly then.
 */
export const vatsimControllersTable = sqliteTable('vatsim_controllers', {
	cid: text('cid').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	namePrivacy: integer('name_privacy', { mode: 'boolean' }).notNull(),
	/** ATC rating's short code, e.g. `S3`. */
	rating: text('rating').notNull(),
	facilityJoinedAt: text('facility_joined_at'),
	/** VATUSA facility role codes held at ZID, e.g. `ATM`, `EC`. */
	roles: text('roles', { mode: 'json' }).$type<string[]>().notNull(),
	/** Code of the highest certification held, or null for none. */
	certification: text('certification'),
	/** Codes of the endorsements held. */
	endorsements: text('endorsements', { mode: 'json' }).$type<string[]>().notNull()
});

/** The certifications and endorsements the training app offers, as it last answered. */
export const availableCredentialsTable = sqliteTable('available_credentials', {
	code: text('code').primaryKey(),
	kind: text('kind', { enum: ['certification', 'endorsement'] }).notNull(),
	name: text('name').notNull(),
	/** Position in the ladder, from 1: certifications lowest to highest, then endorsements. */
	order: integer('sort_order').notNull()
});

export const vatsimControllersRelations = relations(vatsimControllersTable, ({ one, many }) => ({
	user: one(usersTable, {
		fields: [vatsimControllersTable.cid],
		references: [usersTable.cid]
	})
}));
