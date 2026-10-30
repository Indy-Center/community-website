-- The roster copy moves from VATUSA's record as JSON to the training app's named fields. Every
-- existing row is carried, so sign-in membership and roles keep working before the first refresh;
-- credentials stay empty until then. Only ZID roles are kept, as the training app sends.
CREATE TABLE `__new_vatsim_controllers` (
	`cid` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`name_privacy` integer NOT NULL,
	`rating` text NOT NULL,
	`facility_joined_at` text,
	`roles` text NOT NULL,
	`certification` text,
	`endorsements` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_vatsim_controllers` (`cid`, `first_name`, `last_name`, `name_privacy`, `rating`, `facility_joined_at`, `roles`, `certification`, `endorsements`)
SELECT
	`cid`,
	coalesce(json_extract(`data`, '$.fname'), ''),
	coalesce(json_extract(`data`, '$.lname'), ''),
	coalesce(json_extract(`data`, '$.flag_nameprivacy'), 0) != 0,
	coalesce(json_extract(`data`, '$.rating_short'), ''),
	json_extract(`data`, '$.facility_join'),
	(
		SELECT json_group_array(json_extract(`role`.`value`, '$.role'))
		FROM json_each(`data`, '$.roles') AS `role`
		WHERE json_extract(`role`.`value`, '$.facility') = 'ZID'
	),
	NULL,
	'[]'
FROM `vatsim_controllers`;
--> statement-breakpoint
DROP TABLE `vatsim_controllers`;
--> statement-breakpoint
ALTER TABLE `__new_vatsim_controllers` RENAME TO `vatsim_controllers`;
--> statement-breakpoint
CREATE TABLE `available_credentials` (
	`code` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL
);
