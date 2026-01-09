CREATE TABLE `attorney_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`attorney_id` text NOT NULL,
	`calendar_id` text NOT NULL,
	`calendar_name` text NOT NULL,
	`calendar_email` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`service_account_key` text,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`attorney_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `client_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`person_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matter_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`matter_id` text NOT NULL,
	`person_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matters_to_services` (
	`matter_id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`engaged_at` integer DEFAULT (unixepoch()) NOT NULL,
	`assigned_attorney_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	PRIMARY KEY(`matter_id`, `catalog_id`),
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_attorney_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`matter_id` text NOT NULL,
	`payment_type` text NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text,
	`lawpay_transaction_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`paid_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text,
	`last_name` text,
	`middle_names` text,
	`full_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`date_of_birth` integer,
	`ssn_last_4` text,
	`entity_name` text,
	`entity_type` text,
	`entity_ein` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`questionnaire_id` text,
	`questionnaire_responses` text,
	`consultation_fee_paid` integer DEFAULT false NOT NULL,
	`payment_id` text,
	`payment_amount` integer,
	`attorney_id` text,
	`calendar_id` text,
	`appointment_id` text,
	`user_id` text,
	`status` text DEFAULT 'PENDING_PAYMENT' NOT NULL,
	`booking_completed_at` integer,
	`converted_to_client_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attorney_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`calendar_id`) REFERENCES `attorney_calendars`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`type` text DEFAULT 'SINGLE' NOT NULL,
	`price` integer NOT NULL,
	`duration` text,
	`consultation_fee` integer DEFAULT 37500,
	`consultation_fee_enabled` integer DEFAULT true NOT NULL,
	`engagement_letter_id` text,
	`workflow_steps` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`engagement_letter_id`) REFERENCES `document_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `client_matters`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journey_step_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`client_journey_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`client_approved` integer DEFAULT false NOT NULL,
	`attorney_approved` integer DEFAULT false NOT NULL,
	`client_approved_at` integer,
	`attorney_approved_at` integer,
	`iteration_count` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_journey_step_progress`("id", "client_journey_id", "step_id", "status", "client_approved", "attorney_approved", "client_approved_at", "attorney_approved_at", "iteration_count", "notes", "started_at", "completed_at", "created_at", "updated_at") SELECT "id", "client_journey_id", "step_id", "status", "client_approved", "attorney_approved", "client_approved_at", "attorney_approved_at", "iteration_count", "notes", "started_at", "completed_at", "created_at", "updated_at" FROM `journey_step_progress`;--> statement-breakpoint
DROP TABLE `journey_step_progress`;--> statement-breakpoint
ALTER TABLE `__new_journey_step_progress` RENAME TO `journey_step_progress`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_snapshot_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_journey_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`content` text NOT NULL,
	`generated_pdf_path` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`sent_at` integer,
	`approved_at` integer,
	`approved_by_client` integer DEFAULT false NOT NULL,
	`approved_by_attorney` integer DEFAULT false NOT NULL,
	`client_feedback` text,
	`attorney_notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_snapshot_versions`("id", "client_journey_id", "version_number", "content", "generated_pdf_path", "status", "sent_at", "approved_at", "approved_by_client", "approved_by_attorney", "client_feedback", "attorney_notes", "created_at", "updated_at") SELECT "id", "client_journey_id", "version_number", "content", "generated_pdf_path", "status", "sent_at", "approved_at", "approved_by_client", "approved_by_attorney", "client_feedback", "attorney_notes", "created_at", "updated_at" FROM `snapshot_versions`;--> statement-breakpoint
DROP TABLE `snapshot_versions`;--> statement-breakpoint
ALTER TABLE `__new_snapshot_versions` RENAME TO `snapshot_versions`;--> statement-breakpoint
CREATE TABLE `__new_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`service_catalog_id` text,
	`name` text NOT NULL,
	`description` text,
	`journey_type` text DEFAULT 'SERVICE' NOT NULL,
	`is_template` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`estimated_duration_days` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`service_catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_journeys`("id", "service_catalog_id", "name", "description", "journey_type", "is_template", "is_active", "estimated_duration_days", "created_at", "updated_at") SELECT "id", "service_catalog_id", "name", "description", "journey_type", "is_template", "is_active", "estimated_duration_days", "created_at", "updated_at" FROM `journeys`;--> statement-breakpoint
DROP TABLE `journeys`;--> statement-breakpoint
ALTER TABLE `__new_journeys` RENAME TO `journeys`;--> statement-breakpoint
CREATE TABLE `__new_matters` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`title` text NOT NULL,
	`matter_number` text,
	`description` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`lead_attorney_id` text,
	`engagement_journey_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_attorney_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`engagement_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_matters`("id", "client_id", "title", "matter_number", "description", "status", "lead_attorney_id", "engagement_journey_id", "created_at", "updated_at") SELECT "id", "client_id", "title", "matter_number", "description", "status", "lead_attorney_id", "engagement_journey_id", "created_at", "updated_at" FROM `matters`;--> statement-breakpoint
DROP TABLE `matters`;--> statement-breakpoint
ALTER TABLE `__new_matters` RENAME TO `matters`;--> statement-breakpoint
CREATE TABLE `__new_questionnaires` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`service_catalog_id` text,
	`questions` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`service_catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_questionnaires`("id", "name", "description", "service_catalog_id", "questions", "is_active", "created_at", "updated_at") SELECT "id", "name", "description", "service_catalog_id", "questions", "is_active", "created_at", "updated_at" FROM `questionnaires`;--> statement-breakpoint
DROP TABLE `questionnaires`;--> statement-breakpoint
ALTER TABLE `__new_questionnaires` RENAME TO `questionnaires`;--> statement-breakpoint
CREATE TABLE `__new_action_items` (
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
	`system_integration_type` text,
	`resource_id` text,
	`automation_handler` text,
	`is_service_delivery_verification` integer DEFAULT false NOT NULL,
	`verification_criteria` text,
	`verification_evidence` text,
	`completed_at` integer,
	`completed_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_action_items`("id", "step_id", "client_journey_id", "action_type", "title", "description", "config", "status", "assigned_to", "due_date", "priority", "system_integration_type", "resource_id", "automation_handler", "is_service_delivery_verification", "verification_criteria", "verification_evidence", "completed_at", "completed_by", "created_at", "updated_at") SELECT "id", "step_id", "client_journey_id", "action_type", "title", "description", "config", "status", "assigned_to", "due_date", "priority", "system_integration_type", "resource_id", "automation_handler", "is_service_delivery_verification", "verification_criteria", "verification_evidence", "completed_at", "completed_by", "created_at", "updated_at" FROM `action_items`;--> statement-breakpoint
DROP TABLE `action_items`;--> statement-breakpoint
ALTER TABLE `__new_action_items` RENAME TO `action_items`;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_activities`("id", "type", "description", "metadata", "user_id", "created_at") SELECT "id", "type", "description", "metadata", "user_id", "created_at" FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`location` text,
	`notes` text,
	`pre_call_notes` text,
	`call_notes` text,
	`call_notes_updated_at` integer,
	`client_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_appointments`("id", "title", "description", "start_time", "end_time", "status", "location", "notes", "pre_call_notes", "call_notes", "call_notes_updated_at", "client_id", "created_at", "updated_at") SELECT "id", "title", "description", "start_time", "end_time", "status", "location", "notes", "pre_call_notes", "call_notes", "call_notes_updated_at", "client_id", "created_at", "updated_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint
CREATE TABLE `__new_automations` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_automations`("id", "journey_id", "step_id", "name", "description", "trigger_type", "trigger_config", "action_config", "is_active", "last_executed_at", "execution_count", "created_at", "updated_at") SELECT "id", "journey_id", "step_id", "name", "description", "trigger_type", "trigger_config", "action_config", "is_active", "last_executed_at", "execution_count", "created_at", "updated_at" FROM `automations`;--> statement-breakpoint
DROP TABLE `automations`;--> statement-breakpoint
ALTER TABLE `__new_automations` RENAME TO `automations`;--> statement-breakpoint
CREATE TABLE `__new_bridge_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`step_progress_id` text NOT NULL,
	`user_id` text,
	`message` text NOT NULL,
	`is_ai_response` integer DEFAULT false NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`step_progress_id`) REFERENCES `journey_step_progress`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_bridge_conversations`("id", "step_progress_id", "user_id", "message", "is_ai_response", "metadata", "created_at") SELECT "id", "step_progress_id", "user_id", "message", "is_ai_response", "metadata", "created_at" FROM `bridge_conversations`;--> statement-breakpoint
DROP TABLE `bridge_conversations`;--> statement-breakpoint
ALTER TABLE `__new_bridge_conversations` RENAME TO `bridge_conversations`;--> statement-breakpoint
CREATE TABLE `__new_client_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`matter_id` text,
	`catalog_id` text,
	`journey_id` text NOT NULL,
	`current_step_id` text,
	`status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`paused_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`,`catalog_id`) REFERENCES `matters_to_services`(`matter_id`,`catalog_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_journeys`("id", "client_id", "matter_id", "catalog_id", "journey_id", "current_step_id", "status", "priority", "started_at", "completed_at", "paused_at", "created_at", "updated_at") SELECT "id", "client_id", "matter_id", "catalog_id", "journey_id", "current_step_id", "status", "priority", "started_at", "completed_at", "paused_at", "created_at", "updated_at" FROM `client_journeys`;--> statement-breakpoint
DROP TABLE `client_journeys`;--> statement-breakpoint
ALTER TABLE `__new_client_journeys` RENAME TO `client_journeys`;--> statement-breakpoint
CREATE TABLE `__new_client_marketing_attribution` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marketing_source_id`) REFERENCES `marketing_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_marketing_attribution`("id", "client_id", "marketing_source_id", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer_url", "landing_page", "ip_address", "user_agent", "created_at") SELECT "id", "client_id", "marketing_source_id", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer_url", "landing_page", "ip_address", "user_agent", "created_at" FROM `client_marketing_attribution`;--> statement-breakpoint
DROP TABLE `client_marketing_attribution`;--> statement-breakpoint
ALTER TABLE `__new_client_marketing_attribution` RENAME TO `client_marketing_attribution`;--> statement-breakpoint
CREATE UNIQUE INDEX `client_marketing_attribution_client_id_unique` ON `client_marketing_attribution` (`client_id`);--> statement-breakpoint
CREATE TABLE `__new_client_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date_of_birth` integer,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`has_minor_children` integer DEFAULT false NOT NULL,
	`children_info` text,
	`business_name` text,
	`business_type` text,
	`has_will` integer DEFAULT false NOT NULL,
	`has_trust` integer DEFAULT false NOT NULL,
	`last_updated` integer,
	`assigned_lawyer_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_profiles`("id", "user_id", "date_of_birth", "address", "city", "state", "zip_code", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "last_updated", "assigned_lawyer_id", "created_at", "updated_at") SELECT "id", "user_id", "date_of_birth", "address", "city", "state", "zip_code", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "last_updated", "assigned_lawyer_id", "created_at", "updated_at" FROM `client_profiles`;--> statement-breakpoint
DROP TABLE `client_profiles`;--> statement-breakpoint
ALTER TABLE `__new_client_profiles` RENAME TO `client_profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `client_profiles_user_id_unique` ON `client_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_document_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`folder_id` text,
	`content` text NOT NULL,
	`variables` text NOT NULL,
	`variable_mappings` text,
	`requires_notary` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`original_file_name` text,
	`file_extension` text,
	`docx_blob_key` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `template_folders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_document_templates`("id", "name", "description", "category", "folder_id", "content", "variables", "variable_mappings", "requires_notary", "is_active", "order", "original_file_name", "file_extension", "docx_blob_key", "created_at", "updated_at") SELECT "id", "name", "description", "category", "folder_id", "content", "variables", "variable_mappings", "requires_notary", "is_active", "order", "original_file_name", "file_extension", "docx_blob_key", "created_at", "updated_at" FROM `document_templates`;--> statement-breakpoint
DROP TABLE `document_templates`;--> statement-breakpoint
ALTER TABLE `__new_document_templates` RENAME TO `document_templates`;--> statement-breakpoint
CREATE TABLE `__new_document_uploads` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`replaces_upload_id`) REFERENCES `document_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_document_uploads`("id", "client_journey_id", "action_item_id", "uploaded_by_user_id", "document_category", "file_name", "original_file_name", "file_path", "file_size", "mime_type", "status", "reviewed_by_user_id", "reviewed_at", "review_notes", "version", "replaces_upload_id", "created_at", "updated_at") SELECT "id", "client_journey_id", "action_item_id", "uploaded_by_user_id", "document_category", "file_name", "original_file_name", "file_path", "file_size", "mime_type", "status", "reviewed_by_user_id", "reviewed_at", "review_notes", "version", "replaces_upload_id", "created_at", "updated_at" FROM `document_uploads`;--> statement-breakpoint
DROP TABLE `document_uploads`;--> statement-breakpoint
ALTER TABLE `__new_document_uploads` RENAME TO `document_uploads`;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`template_id` text,
	`matter_id` text,
	`content` text NOT NULL,
	`file_path` text,
	`file_size` integer,
	`mime_type` text,
	`variable_values` text,
	`docx_blob_key` text,
	`notarization_status` text,
	`pandadoc_request_id` text,
	`requires_notary` integer DEFAULT false NOT NULL,
	`attorney_approved` integer DEFAULT false NOT NULL,
	`attorney_approved_at` integer,
	`attorney_approved_by` text,
	`ready_for_signature` integer DEFAULT false NOT NULL,
	`ready_for_signature_at` integer,
	`client_id` text NOT NULL,
	`signed_at` integer,
	`signature_data` text,
	`viewed_at` integer,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `document_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attorney_approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "title", "description", "status", "template_id", "matter_id", "content", "file_path", "file_size", "mime_type", "variable_values", "docx_blob_key", "notarization_status", "pandadoc_request_id", "requires_notary", "attorney_approved", "attorney_approved_at", "attorney_approved_by", "ready_for_signature", "ready_for_signature_at", "client_id", "signed_at", "signature_data", "viewed_at", "sent_at", "created_at", "updated_at") SELECT "id", "title", "description", "status", "template_id", "matter_id", "content", "file_path", "file_size", "mime_type", "variable_values", "docx_blob_key", "notarization_status", "pandadoc_request_id", "requires_notary", "attorney_approved", "attorney_approved_at", "attorney_approved_by", "ready_for_signature", "ready_for_signature_at", "client_id", "signed_at", "signature_data", "viewed_at", "sent_at", "created_at", "updated_at" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE TABLE `__new_faq_library` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_faq_library`("id", "journey_id", "step_id", "category", "question", "answer", "tags", "view_count", "helpful_count", "unhelpful_count", "is_active", "created_at", "updated_at") SELECT "id", "journey_id", "step_id", "category", "question", "answer", "tags", "view_count", "helpful_count", "unhelpful_count", "is_active", "created_at", "updated_at" FROM `faq_library`;--> statement-breakpoint
DROP TABLE `faq_library`;--> statement-breakpoint
ALTER TABLE `__new_faq_library` RENAME TO `faq_library`;--> statement-breakpoint
CREATE TABLE `__new_journey_steps` (
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
	`is_final_step` integer DEFAULT false NOT NULL,
	`completion_requirements` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_journey_steps`("id", "journey_id", "step_type", "name", "description", "step_order", "responsible_party", "expected_duration_days", "automation_config", "help_content", "allow_multiple_iterations", "is_final_step", "completion_requirements", "requires_verification", "created_at", "updated_at") SELECT "id", "journey_id", "step_type", "name", "description", "step_order", "responsible_party", "expected_duration_days", "automation_config", "help_content", "allow_multiple_iterations", "is_final_step", "completion_requirements", "requires_verification", "created_at", "updated_at" FROM `journey_steps`;--> statement-breakpoint
DROP TABLE `journey_steps`;--> statement-breakpoint
ALTER TABLE `__new_journey_steps` RENAME TO `journey_steps`;--> statement-breakpoint
CREATE TABLE `__new_lawpay_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`merchant_public_key` text NOT NULL,
	`merchant_name` text,
	`scope` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lawpay_connections`("id", "user_id", "merchant_public_key", "merchant_name", "scope", "expires_at", "revoked_at", "created_at", "updated_at") SELECT "id", "user_id", "merchant_public_key", "merchant_name", "scope", "expires_at", "revoked_at", "created_at", "updated_at" FROM `lawpay_connections`;--> statement-breakpoint
DROP TABLE `lawpay_connections`;--> statement-breakpoint
ALTER TABLE `__new_lawpay_connections` RENAME TO `lawpay_connections`;--> statement-breakpoint
CREATE TABLE `__new_marketing_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`acquisition_cost` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_marketing_sources`("id", "name", "utm_source", "utm_medium", "utm_campaign", "acquisition_cost", "is_active", "created_at", "updated_at") SELECT "id", "name", "utm_source", "utm_medium", "utm_campaign", "acquisition_cost", "is_active", "created_at", "updated_at" FROM `marketing_sources`;--> statement-breakpoint
DROP TABLE `marketing_sources`;--> statement-breakpoint
ALTER TABLE `__new_marketing_sources` RENAME TO `marketing_sources`;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_notes`("id", "content", "client_id", "created_at", "updated_at") SELECT "id", "content", "client_id", "created_at", "updated_at" FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
CREATE TABLE `__new_questionnaire_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`questionnaire_id` text NOT NULL,
	`appointment_id` text,
	`user_id` text,
	`responses` text NOT NULL,
	`attorney_notes` text,
	`attorney_notes_updated_at` integer,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_questionnaire_responses`("id", "questionnaire_id", "appointment_id", "user_id", "responses", "attorney_notes", "attorney_notes_updated_at", "submitted_at") SELECT "id", "questionnaire_id", "appointment_id", "user_id", "responses", "attorney_notes", "attorney_notes_updated_at", "submitted_at" FROM `questionnaire_responses`;--> statement-breakpoint
DROP TABLE `questionnaire_responses`;--> statement-breakpoint
ALTER TABLE `__new_questionnaire_responses` RENAME TO `questionnaire_responses`;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "key", "value", "description", "created_at", "updated_at") SELECT "id", "key", "value", "description", "created_at", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `__new_template_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `template_folders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_template_folders`("id", "name", "description", "parent_id", "order", "created_at", "updated_at") SELECT "id", "name", "description", "parent_id", "order", "created_at", "updated_at" FROM `template_folders`;--> statement-breakpoint
DROP TABLE `template_folders`;--> statement-breakpoint
ALTER TABLE `__new_template_folders` RENAME TO `template_folders`;--> statement-breakpoint
CREATE TABLE `__new_uploaded_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`blob_path` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`content_text` text,
	`content_html` text,
	`paragraph_count` integer,
	`error_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`file_size` integer,
	`mime_type` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`processed_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_uploaded_documents`("id", "user_id", "filename", "blob_path", "status", "content_text", "content_html", "paragraph_count", "error_message", "retry_count", "file_size", "mime_type", "created_at", "processed_at", "updated_at") SELECT "id", "user_id", "filename", "blob_path", "status", "content_text", "content_html", "paragraph_count", "error_message", "retry_count", "file_size", "mime_type", "created_at", "processed_at", "updated_at" FROM `uploaded_documents`;--> statement-breakpoint
DROP TABLE `uploaded_documents`;--> statement-breakpoint
ALTER TABLE `__new_uploaded_documents` RENAME TO `uploaded_documents`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
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
INSERT INTO `__new_users`("id", "email", "password", "role", "first_name", "last_name", "phone", "avatar", "status", "created_at", "updated_at") SELECT "id", "email", "password", "role", "first_name", "last_name", "phone", "avatar", "status", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);