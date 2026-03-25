CREATE TABLE `form_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`form_id` text NOT NULL,
	`field_type` text NOT NULL,
	`label` text NOT NULL,
	`field_order` integer DEFAULT 0 NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`config` text,
	`conditional_logic` text,
	`person_field_mapping` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `form_sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `form_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`title` text,
	`description` text,
	`section_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`public_booking_id` text,
	`action_item_id` text,
	`appointment_id` text,
	`matter_id` text,
	`client_journey_id` text,
	`person_id` text,
	`submitted_by_user_id` text,
	`data` text NOT NULL,
	`attorney_notes` text,
	`attorney_notes_updated_at` integer,
	`submitter_email` text,
	`submitter_ip` text,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`public_booking_id`) REFERENCES `public_bookings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`form_type` text DEFAULT 'questionnaire' NOT NULL,
	`is_multi_step` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`settings` text,
	`legacy_questionnaire_id` text,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`legacy_questionnaire_id`) REFERENCES `questionnaires`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_slug_unique` ON `forms` (`slug`);--> statement-breakpoint
ALTER TABLE `appointment_types` ADD `form_id` text;--> statement-breakpoint
ALTER TABLE `public_bookings` ADD `form_id` text;--> statement-breakpoint
ALTER TABLE `public_bookings` ADD `form_submission_id` text;