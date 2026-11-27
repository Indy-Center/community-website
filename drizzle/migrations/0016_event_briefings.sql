CREATE TABLE `event_booking_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`position_id` text NOT NULL,
	`callsign` text,
	`cid` text NOT NULL,
	`action` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `event_booking_problems_event_id_idx` ON `event_booking_problems` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_briefings` (
	`event_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`brief_url` text,
	`role_id` text,
	`message_ids` text NOT NULL,
	`sent_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
