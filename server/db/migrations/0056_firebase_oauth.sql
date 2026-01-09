-- Firebase OAuth Authentication
-- Creates oauth_providers table and adds firebase_uid to users

CREATE TABLE `oauth_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`button_color` text DEFAULT '#4285F4' NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_providers_provider_id_unique` ON `oauth_providers` (`provider_id`);
--> statement-breakpoint
-- ALTER TABLE `users` ADD `firebase_uid` text;
--> statement-breakpoint
-- CREATE UNIQUE INDEX `users_firebase_uid_unique` ON `users` (`firebase_uid`);
