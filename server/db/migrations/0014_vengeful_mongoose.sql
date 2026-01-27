CREATE TABLE `estate_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`primary_person_id` text NOT NULL,
	`secondary_person_id` text,
	`plan_type` text NOT NULL,
	`plan_name` text,
	`current_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`effective_date` integer,
	`last_amended_at` integer,
	`administration_started_at` integer,
	`closed_at` integer,
	`creation_matter_id` text,
	`wealthcounsel_client_id` text,
	`import_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`primary_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`secondary_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creation_matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_date` integer NOT NULL,
	`description` text,
	`notes` text,
	`person_id` text,
	`role_id` text,
	`matter_id` text,
	`distribution_amount` integer,
	`distribution_description` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `plan_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`established_in_version` integer,
	`terminated_in_version` integer,
	`person_id` text NOT NULL,
	`person_snapshot` text,
	`role_category` text NOT NULL,
	`role_type` text NOT NULL,
	`is_primary` integer DEFAULT false,
	`ordinal` integer DEFAULT 0,
	`share_percentage` integer,
	`share_type` text,
	`share_amount` integer,
	`share_description` text,
	`conditions` text,
	`trust_id` text,
	`subtrust_name` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`effective_date` integer,
	`termination_date` integer,
	`termination_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trust_id`) REFERENCES `trusts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_to_matters` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`matter_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`plan_version_id` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_version_id`) REFERENCES `plan_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`version` integer NOT NULL,
	`matter_id` text,
	`change_type` text NOT NULL,
	`change_description` text,
	`change_summary` text,
	`effective_date` integer,
	`role_snapshot` text,
	`source_type` text,
	`source_xml` text,
	`source_data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` text,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trusts` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`trust_name` text NOT NULL,
	`trust_type` text,
	`is_joint` integer DEFAULT false,
	`is_revocable` integer DEFAULT true,
	`jurisdiction` text,
	`formation_date` integer,
	`funding_date` integer,
	`pour_over_will_id` text,
	`wealthcounsel_trust_id` text,
	`trust_settings` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wills` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`will_type` text,
	`execution_date` integer,
	`jurisdiction` text,
	`codicil_count` integer DEFAULT 0,
	`pour_over_trust_id` text,
	`probate_status` text,
	`probate_filed_at` integer,
	`probate_case_number` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pour_over_trust_id`) REFERENCES `trusts`(`id`) ON UPDATE no action ON DELETE no action
);
