PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Drop view first; it references the old matters.client_id semantics and
-- will be rebuilt below with the new (direct) join.
DROP VIEW IF EXISTS `clients_with_status`;--> statement-breakpoint
CREATE TABLE `__new_matters` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`title` text NOT NULL,
	`matter_number` text,
	`description` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`lead_attorney_id` text,
	`engagement_journey_id` text,
	`google_drive_folder_id` text,
	`google_drive_folder_url` text,
	`google_drive_sync_status` text DEFAULT 'NOT_SYNCED',
	`google_drive_sync_error` text,
	`google_drive_last_sync_at` integer,
	`google_drive_subfolder_ids` text,
	`import_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_attorney_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`engagement_journey_id`) REFERENCES `client_journeys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Data translation: matters.client_id was users.id, now references clients.id.
-- Copy only rows whose user has a corresponding clients record; orphans are
-- dropped (matter cascade-deletes journeys/documents we already migrated).
INSERT INTO `__new_matters`("id", "client_id", "title", "matter_number", "description", "status", "lead_attorney_id", "engagement_journey_id", "google_drive_folder_id", "google_drive_folder_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_last_sync_at", "google_drive_subfolder_ids", "import_metadata", "created_at", "updated_at")
SELECT
  m."id",
  (SELECT c."id" FROM `clients` c INNER JOIN `users` u ON u."person_id" = c."person_id" WHERE u."id" = m."client_id") AS client_id_translated,
  m."title", m."matter_number", m."description", m."status", m."lead_attorney_id", m."engagement_journey_id",
  m."google_drive_folder_id", m."google_drive_folder_url", m."google_drive_sync_status", m."google_drive_sync_error",
  m."google_drive_last_sync_at", m."google_drive_subfolder_ids", m."import_metadata", m."created_at", m."updated_at"
FROM `matters` m
WHERE EXISTS (
  SELECT 1 FROM `clients` c INNER JOIN `users` u ON u."person_id" = c."person_id"
  WHERE u."id" = m."client_id"
);--> statement-breakpoint
DROP TABLE `matters`;--> statement-breakpoint
ALTER TABLE `__new_matters` RENAME TO `matters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_matters_client_id` ON `matters` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_matters_status` ON `matters` (`status`);--> statement-breakpoint
CREATE INDEX `idx_matters_created_at` ON `matters` (`created_at`);--> statement-breakpoint
DROP VIEW IF EXISTS `clients_with_status`;--> statement-breakpoint
CREATE VIEW `clients_with_status` AS select "id", "person_id", CASE
      WHEN EXISTS (
        SELECT 1 FROM matters m
        WHERE m.client_id = "clients"."id" AND m.status = 'OPEN'
      ) THEN 'ACTIVE'
      WHEN EXISTS (
        SELECT 1 FROM matters m
        WHERE m.client_id = "clients"."id"
      ) AND NOT EXISTS (
        SELECT 1 FROM matters m
        WHERE m.client_id = "clients"."id" AND m.status != 'CLOSED'
      ) THEN 'FORMER'
      ELSE 'PROSPECTIVE'
    END as "status", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "referral_type", "referred_by_person_id", "referred_by_partner_id", "referral_notes", "initial_attribution_source", "initial_attribution_medium", "initial_attribution_campaign", "google_drive_folder_id", "google_drive_folder_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_last_sync_at", "google_drive_subfolder_ids", "assigned_lawyer_id", "import_metadata", "created_at", "updated_at" from "clients";