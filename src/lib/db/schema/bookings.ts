import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Bookings sent to the bookings Worker that haven't shown up in its list yet. Writes are queued, so
 * until the list catches up this holds the position for everyone (conflict checks count these rows)
 * and shows the booker their booking as pending. A row goes once its `externalId` is in the list,
 * or after it has waited too long, which means the booking system refused it.
 */
export const pendingBookingsTable = sqliteTable('pending_bookings', {
	/** The ID we gave the Worker with the booking. */
	externalId: text('external_id').primaryKey(),
	callsign: text('callsign').notNull(),
	cid: text('cid').notNull(),
	start: integer('start', { mode: 'timestamp_ms' }).notNull(),
	end: integer('end', { mode: 'timestamp_ms' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});
