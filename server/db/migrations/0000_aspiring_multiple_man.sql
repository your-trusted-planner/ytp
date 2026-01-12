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
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`user_id` text NOT NULL,
	`user_role` text,
	`target_type` text,
	`target_id` text,
	`journey_id` text,
	`journey_step_id` text,
	`matter_id` text,
	`service_id` text,
	`attribution_source` text,
	`attribution_medium` text,
	`attribution_campaign` text,
	`ip_address` text,
	`user_agent` text,
	`country` text,
	`city` text,
	`request_id` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `appointments` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`step_progress_id`) REFERENCES `journey_step_progress`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `client_journeys` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marketing_source_id`) REFERENCES `marketing_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_marketing_attribution_client_id_unique` ON `client_marketing_attribution` (`client_id`);--> statement-breakpoint
CREATE TABLE `client_profiles` (
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
	`referral_type` text,
	`referred_by_user_id` text,
	`referred_by_partner_id` text,
	`referral_notes` text,
	`initial_attribution_source` text,
	`initial_attribution_medium` text,
	`initial_attribution_campaign` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referred_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_profiles_user_id_unique` ON `client_profiles` (`user_id`);--> statement-breakpoint
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
CREATE TABLE `document_templates` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`replaces_upload_id`) REFERENCES `document_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
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
	`signed_pdf_blob_key` text,
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
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
	`is_final_step` integer DEFAULT false NOT NULL,
	`completion_requirements` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`service_catalog_id` text,
	`name` text NOT NULL,
	`description` text,
	`journey_type` text DEFAULT 'SERVICE' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`estimated_duration_days` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`service_catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lawpay_connections` (
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
CREATE TABLE `marketing_sources` (
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
CREATE TABLE `matters` (
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
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE UNIQUE INDEX `oauth_providers_provider_id_unique` ON `oauth_providers` (`provider_id`);--> statement-breakpoint
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
CREATE TABLE `questionnaire_responses` (
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
CREATE TABLE `questionnaires` (
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
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `signature_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`signer_id` text NOT NULL,
	`signature_tier` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`identity_verified` integer DEFAULT false NOT NULL,
	`identity_verification_method` text,
	`identity_verified_at` integer,
	`identity_provider` text,
	`identity_reference_id` text,
	`signing_token` text,
	`token_expires_at` integer,
	`ip_address` text,
	`user_agent` text,
	`geolocation` text,
	`signature_data` text,
	`signature_hash` text,
	`signed_at` integer,
	`signature_certificate` text,
	`terms_accepted_at` integer,
	`terms_version` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`signer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signature_sessions_signing_token_unique` ON `signature_sessions` (`signing_token`);--> statement-breakpoint
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
	`approved_by_attorney` integer DEFAULT false NOT NULL,
	`client_feedback` text,
	`attorney_notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template_folders` (
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
CREATE TABLE `uploaded_documents` (
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
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`firebase_uid` text,
	`role` text DEFAULT 'PROSPECT' NOT NULL,
	`admin_level` integer DEFAULT 0,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`avatar` text,
	`status` text DEFAULT 'PROSPECT' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_firebase_uid_unique` ON `users` (`firebase_uid`);