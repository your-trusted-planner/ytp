CREATE TABLE `appointment_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`default_duration_minutes` integer DEFAULT 60 NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`consultation_fee` integer DEFAULT 0,
	`consultation_fee_enabled` integer DEFAULT false NOT NULL,
	`questionnaire_id` text,
	`service_catalog_id` text,
	`assigned_attorney_ids` text,
	`business_hours` text,
	`default_location` text,
	`is_publicly_bookable` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appointment_types_slug_unique` ON `appointment_types` (`slug`);--> statement-breakpoint
ALTER TABLE `appointments` ADD `appointment_type_id` text REFERENCES appointment_types(id);--> statement-breakpoint
ALTER TABLE `public_bookings` ADD `appointment_type_id` text REFERENCES appointment_types(id);