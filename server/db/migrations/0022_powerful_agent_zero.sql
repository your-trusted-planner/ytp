CREATE TABLE `marketing_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`channel_type` text NOT NULL,
	`slug` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_channels_slug_unique` ON `marketing_channels` (`slug`);--> statement-breakpoint
CREATE TABLE `marketing_consent` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`status` text NOT NULL,
	`consent_source` text NOT NULL,
	`consent_note` text,
	`consent_ip` text,
	`consent_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `marketing_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_person_channel` ON `marketing_consent` (`person_id`,`channel_id`);--> statement-breakpoint
CREATE TABLE `marketing_consent_history` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`previous_status` text,
	`new_status` text NOT NULL,
	`changed_by_user_id` text,
	`changed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`consent_source` text NOT NULL,
	`consent_ip` text,
	`note` text,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `marketing_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `people` ADD `global_unsubscribe` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `global_unsubscribe_at` integer;--> statement-breakpoint
ALTER TABLE `people` ADD `global_unsubscribe_source` text;