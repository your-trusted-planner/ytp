CREATE TABLE `person_external_ids` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`is_primary` integer DEFAULT true NOT NULL,
	`metadata` text,
	`linked_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
