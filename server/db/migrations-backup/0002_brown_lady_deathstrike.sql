CREATE TABLE `action_items` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text,
	`client_journey_id` text,
	`action_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`config` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`assigned_to` text DEFAULT 'CLIENT' NOT NULL,
	`due_date` integer,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`completed_at` integer,
	`completed_by` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text,
	`step_id` text,
	`name` text NOT NULL,
	`description` text,
	`trigger_type` text NOT NULL,
	`trigger_config` text NOT NULL,
	`action_config` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_executed_at` integer,
	`execution_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bridge_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`step_progress_id` text NOT NULL,
	`user_id` text,
	`message` text NOT NULL,
	`is_ai_response` integer DEFAULT false NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`step_progress_id`) REFERENCES `journey_step_progress`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `client_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`current_step_id` text,
	`status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`paused_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `client_marketing_attribution` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`marketing_source_id` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`referrer_url` text,
	`landing_page` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marketing_source_id`) REFERENCES `marketing_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_marketing_attribution_client_id_unique` ON `client_marketing_attribution` (`client_id`);--> statement-breakpoint
CREATE TABLE `document_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`client_journey_id` text,
	`action_item_id` text,
	`uploaded_by_user_id` text NOT NULL,
	`document_category` text,
	`file_name` text NOT NULL,
	`original_file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`status` text DEFAULT 'PENDING_REVIEW' NOT NULL,
	`reviewed_by_user_id` text,
	`reviewed_at` integer,
	`review_notes` text,
	`version` integer DEFAULT 1 NOT NULL,
	`replaces_upload_id` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`replaces_upload_id`) REFERENCES `document_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faq_library` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text,
	`step_id` text,
	`category` text,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`tags` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`helpful_count` integer DEFAULT 0 NOT NULL,
	`unhelpful_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `journey_step_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`client_journey_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`client_approved` integer DEFAULT false NOT NULL,
	`council_approved` integer DEFAULT false NOT NULL,
	`client_approved_at` integer,
	`council_approved_at` integer,
	`iteration_count` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journey_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text NOT NULL,
	`step_type` text DEFAULT 'MILESTONE' NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`step_order` integer DEFAULT 0 NOT NULL,
	`responsible_party` text DEFAULT 'CLIENT' NOT NULL,
	`expected_duration_days` integer,
	`automation_config` text,
	`help_content` text,
	`allow_multiple_iterations` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`matter_id` text,
	`name` text NOT NULL,
	`description` text,
	`is_template` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`estimated_duration_days` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `marketing_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`acquisition_cost` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshot_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_journey_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`content` text NOT NULL,
	`generated_pdf_path` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`sent_at` integer,
	`approved_at` integer,
	`approved_by_client` integer DEFAULT false NOT NULL,
	`approved_by_council` integer DEFAULT false NOT NULL,
	`client_feedback` text,
	`council_notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
