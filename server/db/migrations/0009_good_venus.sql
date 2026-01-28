CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`credentials_key` text,
	`status` text DEFAULT 'CONFIGURED' NOT NULL,
	`last_tested_at` integer,
	`last_error_message` text,
	`settings` text,
	`last_sync_timestamps` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `migration_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`external_id` text,
	`error_type` text NOT NULL,
	`error_message` text NOT NULL,
	`error_details` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`retried_at` integer,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `migration_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `migration_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`run_type` text NOT NULL,
	`entity_types` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`total_entities` integer,
	`processed_entities` integer DEFAULT 0 NOT NULL,
	`created_records` integer DEFAULT 0 NOT NULL,
	`updated_records` integer DEFAULT 0 NOT NULL,
	`skipped_records` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`checkpoint` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`integration_id`) REFERENCES `integrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`password` text,
	`firebase_uid` text,
	`role` text DEFAULT 'PROSPECT' NOT NULL,
	`admin_level` integer DEFAULT 0,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`avatar` text,
	`signature_image` text,
	`signature_image_updated_at` integer,
	`status` text DEFAULT 'PROSPECT' NOT NULL,
	`import_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password", "firebase_uid", "role", "admin_level", "first_name", "last_name", "phone", "avatar", "signature_image", "signature_image_updated_at", "status", "created_at", "updated_at") SELECT "id", "email", "password", "firebase_uid", "role", "admin_level", "first_name", "last_name", "phone", "avatar", "signature_image", "signature_image_updated_at", "status", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_firebase_uid_unique` ON `users` (`firebase_uid`);--> statement-breakpoint
ALTER TABLE `activities` ADD `import_metadata` text;--> statement-breakpoint
ALTER TABLE `matters` ADD `import_metadata` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `import_metadata` text;--> statement-breakpoint
ALTER TABLE `referral_partners` ADD `import_metadata` text;