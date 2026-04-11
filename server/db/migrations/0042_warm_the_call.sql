ALTER TABLE `people` ADD `tin_encrypted` text;--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`entity_type` text,
	`jurisdiction` text,
	`formation_date` integer,
	`state_file_number` text,
	`management_type` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_person_id_unique` ON `entities` (`person_id`);--> statement-breakpoint
CREATE INDEX `idx_entities_person_id` ON `entities` (`person_id`);--> statement-breakpoint
CREATE INDEX `idx_entities_entity_type` ON `entities` (`entity_type`);--> statement-breakpoint
ALTER TABLE `people` ADD `tin_last_4` text;--> statement-breakpoint
UPDATE `people` SET `tin_last_4` = `ssn_last_4` WHERE `ssn_last_4` IS NOT NULL AND `tin_last_4` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "recipient_person_id", "recipient_address", "sender_user_id", "channel", "category", "template_slug", "subject", "body", "body_format", "context_type", "context_id", "status", "provider_message_id", "failure_reason", "metadata", "queued_at", "sent_at", "delivered_at", "failed_at", "created_at") SELECT "id", "recipient_person_id", "recipient_address", "sender_user_id", "channel", "category", "template_slug", "subject", "body", "body_format", "context_type", "context_id", "status", "provider_message_id", "failure_reason", "metadata", "queued_at", "sent_at", "delivered_at", "failed_at", "created_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_messages_recipient` ON `messages` (`recipient_person_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `messages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_messages_context` ON `messages` (`context_type`,`context_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_created_at` ON `messages` (`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trusts` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text,
	`person_id` text,
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
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_trusts`("id", "plan_id", "trust_name", "trust_type", "is_joint", "is_revocable", "jurisdiction", "formation_date", "funding_date", "pour_over_will_id", "wealthcounsel_trust_id", "trust_settings", "created_at", "updated_at") SELECT "id", "plan_id", "trust_name", "trust_type", "is_joint", "is_revocable", "jurisdiction", "formation_date", "funding_date", "pour_over_will_id", "wealthcounsel_trust_id", "trust_settings", "created_at", "updated_at" FROM `trusts`;--> statement-breakpoint
DROP TABLE `trusts`;--> statement-breakpoint
ALTER TABLE `__new_trusts` RENAME TO `trusts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;