PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`status` text DEFAULT 'PROSPECTIVE' NOT NULL,
	`has_minor_children` integer DEFAULT false NOT NULL,
	`children_info` text,
	`business_name` text,
	`business_type` text,
	`has_will` integer DEFAULT false NOT NULL,
	`has_trust` integer DEFAULT false NOT NULL,
	`referral_type` text,
	`referred_by_person_id` text,
	`referred_by_partner_id` text,
	`referral_notes` text,
	`initial_attribution_source` text,
	`initial_attribution_medium` text,
	`initial_attribution_campaign` text,
	`google_drive_folder_id` text,
	`google_drive_folder_url` text,
	`google_drive_sync_status` text DEFAULT 'NOT_SYNCED',
	`google_drive_sync_error` text,
	`google_drive_last_sync_at` integer,
	`google_drive_subfolder_ids` text,
	`assigned_lawyer_id` text,
	`import_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referred_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_clients`("id", "person_id", "status", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "referral_type", "referred_by_person_id", "referred_by_partner_id", "referral_notes", "initial_attribution_source", "initial_attribution_medium", "initial_attribution_campaign", "google_drive_folder_id", "google_drive_folder_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_last_sync_at", "google_drive_subfolder_ids", "assigned_lawyer_id", "import_metadata", "created_at", "updated_at") SELECT "id", "person_id", "status", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "referral_type", "referred_by_person_id", "referred_by_partner_id", "referral_notes", "initial_attribution_source", "initial_attribution_medium", "initial_attribution_campaign", "google_drive_folder_id", "google_drive_folder_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_last_sync_at", "google_drive_subfolder_ids", "assigned_lawyer_id", "import_metadata", "created_at", "updated_at" FROM `clients`;--> statement-breakpoint
DROP TABLE `clients`;--> statement-breakpoint
ALTER TABLE `__new_clients` RENAME TO `clients`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `clients_person_id_unique` ON `clients` (`person_id`);--> statement-breakpoint
CREATE VIEW `clients_with_status` AS select "id", "person_id", CASE
      WHEN EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "person_id" AND m.status = 'OPEN'
      ) THEN 'ACTIVE'
      WHEN EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "person_id"
      ) AND NOT EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "person_id" AND m.status != 'CLOSED'
      ) THEN 'FORMER'
      ELSE 'PROSPECTIVE'
    END as "status", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "referral_type", "referred_by_person_id", "referred_by_partner_id", "referral_notes", "initial_attribution_source", "initial_attribution_medium", "initial_attribution_campaign", "google_drive_folder_id", "google_drive_folder_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_last_sync_at", "google_drive_subfolder_ids", "assigned_lawyer_id", "import_metadata", "created_at", "updated_at" from "clients";