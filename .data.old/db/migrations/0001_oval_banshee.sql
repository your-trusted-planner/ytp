CREATE TABLE `client_matters` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`matter_id` text NOT NULL,
	`engagement_letter_doc_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`renewal_date` integer,
	`total_paid` integer DEFAULT 0 NOT NULL,
	`total_price` integer NOT NULL,
	`payment_status` text DEFAULT 'UNPAID' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`engagement_letter_doc_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`type` text DEFAULT 'SINGLE' NOT NULL,
	`price` integer NOT NULL,
	`duration` text,
	`engagement_letter_id` text,
	`workflow_steps` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`engagement_letter_id`) REFERENCES `document_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questionnaire_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`questionnaire_id` text NOT NULL,
	`appointment_id` text,
	`user_id` text,
	`responses` text NOT NULL,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questionnaires` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`matter_id` text,
	`questions` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'PROSPECT' NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`avatar` text,
	`status` text DEFAULT 'PROSPECT' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password", "role", "first_name", "last_name", "phone", "avatar", "status", "created_at", "updated_at") SELECT "id", "email", "password", "role", "first_name", "last_name", "phone", "avatar", "status", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `document_templates` ADD `requires_notary` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `matter_id` text REFERENCES matters(id);--> statement-breakpoint
ALTER TABLE `documents` ADD `requires_notary` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `notarization_status` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `pandadoc_request_id` text;