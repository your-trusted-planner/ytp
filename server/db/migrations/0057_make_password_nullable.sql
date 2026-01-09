-- Make users.password nullable for OAuth-only users
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`firebase_uid` text,
	`role` text DEFAULT 'PROSPECT' NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`avatar` text,
	`status` text DEFAULT 'PROSPECT' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `email`, `password`, `firebase_uid`, `role`, `first_name`, `last_name`, `phone`, `avatar`, `status`, `created_at`, `updated_at`)
SELECT `id`, `email`, `password`, `firebase_uid`, `role`, `first_name`, `last_name`, `phone`, `avatar`, `status`, `created_at`, `updated_at` FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_firebase_uid_unique` ON `users` (`firebase_uid`);
