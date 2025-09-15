ALTER TABLE `events` ADD `is_roster_published` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `event_positions` DROP COLUMN `opens_at`;--> statement-breakpoint
ALTER TABLE `event_positions` DROP COLUMN `closes_at`;