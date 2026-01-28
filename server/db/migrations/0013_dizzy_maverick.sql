CREATE TABLE `import_duplicates` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`source_data` text,
	`duplicate_type` text NOT NULL,
	`matching_field` text,
	`matching_value` text,
	`confidence_score` integer,
	`existing_person_id` text,
	`resolution` text DEFAULT 'LINKED' NOT NULL,
	`resolved_person_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `migration_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`existing_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
