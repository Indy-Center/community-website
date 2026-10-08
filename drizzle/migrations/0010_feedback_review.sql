CREATE TABLE `feedback_events` (
	`id` text PRIMARY KEY NOT NULL,
	`feedback_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`value` text,
	`body` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
ALTER TABLE `feedback` ADD `assignee_id` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `publish_mode` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `feedback` ADD `published_rating` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `published_position` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `published_callsign` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `published_pilot_name` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `published_feedback` text;--> statement-breakpoint
CREATE INDEX `feedback_events_feedback_id_idx` ON `feedback_events` (`feedback_id`);
