CREATE TABLE `completions` (
	`habit_id` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`habit_id`, `day`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slot` integer NOT NULL,
	`name` text NOT NULL,
	`created_date` text NOT NULL,
	CONSTRAINT "habit_slot_range" CHECK("habits"."slot" >= 1 AND "habits"."slot" <= 5),
	CONSTRAINT "habit_name_length" CHECK(length(trim("habits"."name")) BETWEEN 1 AND 60)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habits_owner_slot` ON `habits` (`user_id`,`slot`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`timezone` text NOT NULL
);
