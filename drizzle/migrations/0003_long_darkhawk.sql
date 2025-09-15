CREATE TABLE `event_position_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`comments` text,
	`created_at` integer DEFAULT (unixepoch())
);
