CREATE TABLE `user_certifications` (
	`user_id` text NOT NULL,
	`certification` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`expires_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_certification` ON `user_certifications` (`user_id`,`certification`);--> statement-breakpoint
CREATE TABLE `user_endorsements` (
	`user_id` text NOT NULL,
	`endorsement` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`cid` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`preferred_name` text,
	`pronouns` text,
	`membership` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vatsim_controllers` (
	`cid` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
