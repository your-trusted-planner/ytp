CREATE TABLE `google_drive_config` (
	`id` text PRIMARY KEY NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`service_account_email` text,
	`service_account_private_key` text,
	`shared_drive_id` text,
	`root_folder_id` text,
	`root_folder_name` text DEFAULT 'YTP Client Files' NOT NULL,
	`impersonate_email` text,
	`matter_subfolders` text DEFAULT '["Generated Documents", "Client Uploads", "Signed Documents", "Correspondence"]' NOT NULL,
	`sync_generated_documents` integer DEFAULT true NOT NULL,
	`sync_client_uploads` integer DEFAULT true NOT NULL,
	`sync_signed_documents` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `google_drive_folder_id` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `google_drive_folder_url` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `google_drive_sync_status` text DEFAULT 'NOT_SYNCED';--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `google_drive_sync_error` text;--> statement-breakpoint
ALTER TABLE `client_profiles` ADD `google_drive_last_sync_at` integer;--> statement-breakpoint
ALTER TABLE `document_uploads` ADD `google_drive_file_id` text;--> statement-breakpoint
ALTER TABLE `document_uploads` ADD `google_drive_file_url` text;--> statement-breakpoint
ALTER TABLE `document_uploads` ADD `google_drive_sync_status` text DEFAULT 'NOT_SYNCED';--> statement-breakpoint
ALTER TABLE `document_uploads` ADD `google_drive_sync_error` text;--> statement-breakpoint
ALTER TABLE `document_uploads` ADD `google_drive_synced_at` integer;--> statement-breakpoint
ALTER TABLE `documents` ADD `google_drive_file_id` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `google_drive_file_url` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `google_drive_sync_status` text DEFAULT 'NOT_SYNCED';--> statement-breakpoint
ALTER TABLE `documents` ADD `google_drive_sync_error` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `google_drive_synced_at` integer;--> statement-breakpoint
ALTER TABLE `matters` ADD `google_drive_folder_id` text;--> statement-breakpoint
ALTER TABLE `matters` ADD `google_drive_folder_url` text;--> statement-breakpoint
ALTER TABLE `matters` ADD `google_drive_sync_status` text DEFAULT 'NOT_SYNCED';--> statement-breakpoint
ALTER TABLE `matters` ADD `google_drive_sync_error` text;--> statement-breakpoint
ALTER TABLE `matters` ADD `google_drive_last_sync_at` integer;--> statement-breakpoint
ALTER TABLE `matters` ADD `google_drive_subfolder_ids` text;