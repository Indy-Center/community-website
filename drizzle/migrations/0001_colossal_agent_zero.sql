PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`roster_type` text DEFAULT 'none' NOT NULL,
	`banner_url` text,
	`description` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "name", "type", "roster_type", "banner_url", "description", "start_time", "end_time", "is_published", "created_at", "updated_at") SELECT "id", "name", "type", "roster_type", "banner_url", "description", "start_time", "end_time", "is_published", "created_at", "updated_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;