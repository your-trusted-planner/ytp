CREATE TABLE `message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'TRANSACTIONAL' NOT NULL,
	`trigger_event` text,
	`email_subject` text,
	`email_body` text,
	`email_text` text,
	`email_header_text` text,
	`email_header_color` text,
	`email_action_label` text,
	`sms_body` text,
	`variable_schema` text,
	`channel_config` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_system_template` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_slug_unique` ON `message_templates` (`slug`);