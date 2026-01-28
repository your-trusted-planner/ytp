CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`status` text DEFAULT 'PROSPECT' NOT NULL,
	`has_minor_children` integer DEFAULT false NOT NULL,
	`children_info` text,
	`business_name` text,
	`business_type` text,
	`has_will` integer DEFAULT false NOT NULL,
	`has_trust` integer DEFAULT false NOT NULL,
	`referral_type` text,
	`referred_by_person_id` text,
	`referred_by_partner_id` text,
	`referral_notes` text,
	`initial_attribution_source` text,
	`initial_attribution_medium` text,
	`initial_attribution_campaign` text,
	`google_drive_folder_id` text,
	`google_drive_folder_url` text,
	`google_drive_sync_status` text DEFAULT 'NOT_SYNCED',
	`google_drive_sync_error` text,
	`google_drive_last_sync_at` integer,
	`google_drive_subfolder_ids` text,
	`assigned_lawyer_id` text,
	`import_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referred_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_person_id_unique` ON `clients` (`person_id`);--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`from_person_id` text NOT NULL,
	`to_person_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`context` text,
	`context_id` text,
	`ordinal` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`from_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `people` ADD `person_type` text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `import_metadata` text;--> statement-breakpoint
ALTER TABLE `users` ADD `person_id` text REFERENCES people(id);