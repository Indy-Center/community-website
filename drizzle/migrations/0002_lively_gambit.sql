CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`submitter_id` text NOT NULL,
	`controller_id` text NOT NULL,
	`rating` text NOT NULL,
	`status` text NOT NULL,
	`position` text NOT NULL,
	`callsign` text,
	`feedback` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
