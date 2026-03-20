CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`building` text,
	`address` text,
	`capacity` integer,
	`calendar_email` text,
	`calendar_provider` text DEFAULT 'google',
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_meeting_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text,
	`provider_email` text,
	`access_token_key` text,
	`refresh_token` text,
	`token_expires_at` integer,
	`scope` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`last_error` text,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `video_meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text,
	`provider` text NOT NULL,
	`provider_meeting_id` text,
	`host_user_id` text,
	`join_url` text,
	`host_url` text,
	`passcode` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`provider_data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`host_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `appointment_types` ADD `default_location_config` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `location_config` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `room_id` text REFERENCES rooms(id);--> statement-breakpoint
ALTER TABLE `appointments` ADD `video_meeting_id` text;