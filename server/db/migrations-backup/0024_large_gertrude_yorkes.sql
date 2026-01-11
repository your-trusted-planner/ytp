CREATE TABLE `event_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`name` text,
	`registered_at` integer DEFAULT (unixepoch()) NOT NULL,
	`attended_at` integer,
	`converted_to_lead_at` integer,
	`converted_to_client_at` integer,
	`attribution_source` text,
	`attribution_medium` text,
	`attribution_campaign` text,
	FOREIGN KEY (`event_id`) REFERENCES `marketing_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `marketing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` integer,
	`description` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `referral_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`type` text NOT NULL,
	`email` text,
	`phone` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `user_role` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `target_type` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `target_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `journey_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `journey_step_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `matter_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `service_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `attribution_source` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `attribution_medium` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `attribution_campaign` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `country` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `city` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `request_id` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `referral_type` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `referred_by_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `referred_by_partner_id` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `referral_notes` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `initial_attribution_source` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `initial_attribution_medium` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `initial_attribution_campaign` text;