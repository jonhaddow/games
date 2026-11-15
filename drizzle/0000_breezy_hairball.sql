CREATE TABLE `best` (
	`game` text NOT NULL,
	`profile_id` text NOT NULL,
	`value` integer NOT NULL,
	`at` text NOT NULL,
	PRIMARY KEY(`game`, `profile_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `best_game_idx` ON `best` (`game`,`value`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`colour` text NOT NULL,
	`created_at` text NOT NULL
);
