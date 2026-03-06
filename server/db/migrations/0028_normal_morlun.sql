DROP VIEW `clients_with_status`;--> statement-breakpoint
CREATE VIEW `clients_with_status` AS select "id", "person_id", CASE
      WHEN EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "clients"."person_id" AND m.status = 'OPEN'
      ) THEN 'ACTIVE'
      WHEN EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "clients"."person_id"
      ) AND NOT EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "clients"."person_id" AND m.status != 'CLOSED'
      ) THEN 'FORMER'
      ELSE 'PROSPECTIVE'
    END as "status", "has_minor_children", "children_info", "business_name", "business_type", "has_will", "has_trust", "referral_type", "referred_by_person_id", "referred_by_partner_id", "referral_notes", "initial_attribution_source", "initial_attribution_medium", "initial_attribution_campaign", "google_drive_folder_id", "google_drive_folder_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_last_sync_at", "google_drive_subfolder_ids", "assigned_lawyer_id", "import_metadata", "created_at", "updated_at" from "clients";