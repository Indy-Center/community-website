CREATE TABLE `event_positions` (
	`event_id` text NOT NULL,
	`position` text NOT NULL,
	`filled_by_user_id` text,
	`required_certifications` text DEFAULT '[]' NOT NULL,
	`required_endorsements` text DEFAULT '[]' NOT NULL,
	`opens_at` integer NOT NULL,
	`closes_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`roster_type` text DEFAULT 'none' NOT NULL,
	`banner_url` text NOT NULL,
	`description` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
