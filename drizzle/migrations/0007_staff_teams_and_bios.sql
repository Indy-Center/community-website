CREATE TABLE `staff_bios` (
	`cid` text PRIMARY KEY NOT NULL,
	`bio` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_team_members` (
	`team` text NOT NULL,
	`cid` text NOT NULL,
	`excluded` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`team`, `cid`)
);
