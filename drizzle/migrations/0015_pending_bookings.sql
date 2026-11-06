CREATE TABLE `pending_bookings` (
	`external_id` text PRIMARY KEY NOT NULL,
	`callsign` text NOT NULL,
	`cid` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`created_at` integer NOT NULL
);
