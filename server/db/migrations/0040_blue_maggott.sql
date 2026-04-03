CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_person_id` text,
	`recipient_address` text NOT NULL,
	`sender_user_id` text,
	`channel` text NOT NULL,
	`category` text DEFAULT 'TRANSACTIONAL' NOT NULL,
	`template_slug` text,
	`subject` text,
	`body` text NOT NULL,
	`body_format` text DEFAULT 'HTML' NOT NULL,
	`context_type` text,
	`context_id` text,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`provider_message_id` text,
	`failure_reason` text,
	`metadata` text,
	`queued_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sent_at` integer,
	`delivered_at` integer,
	`failed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipient_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_recipient` ON `messages` (`recipient_person_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `messages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_messages_context` ON `messages` (`context_type`,`context_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_created_at` ON `messages` (`created_at`);