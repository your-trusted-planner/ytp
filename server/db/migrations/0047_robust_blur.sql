PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Data translation: documents.client_id was users.id, now references clients.id.
-- Translate via the shared person_id, then drop orphan rows whose client has no clients record.
UPDATE `documents` SET `client_id` = (
  SELECT `c`.`id` FROM `clients` `c`
  INNER JOIN `users` `u` ON `u`.`person_id` = `c`.`person_id`
  WHERE `u`.`id` = `documents`.`client_id`
) WHERE EXISTS (
  SELECT 1 FROM `clients` `c`
  INNER JOIN `users` `u` ON `u`.`person_id` = `c`.`person_id`
  WHERE `u`.`id` = `documents`.`client_id`
);--> statement-breakpoint
DELETE FROM `documents` WHERE `client_id` NOT IN (SELECT `id` FROM `clients`);--> statement-breakpoint
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
	`unsigned_pdf_blob_key` text,
	`signed_pdf_blob_key` text,
	`field_placements` text,
	`signer_count` integer DEFAULT 1 NOT NULL,
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
	`google_drive_file_id` text,
	`google_drive_file_url` text,
	`google_drive_sync_status` text DEFAULT 'NOT_SYNCED',
	`google_drive_sync_error` text,
	`google_drive_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `document_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attorney_approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "title", "description", "status", "template_id", "matter_id", "content", "file_path", "file_size", "mime_type", "variable_values", "docx_blob_key", "unsigned_pdf_blob_key", "signed_pdf_blob_key", "field_placements", "signer_count", "notarization_status", "pandadoc_request_id", "requires_notary", "attorney_approved", "attorney_approved_at", "attorney_approved_by", "ready_for_signature", "ready_for_signature_at", "client_id", "signed_at", "signature_data", "viewed_at", "sent_at", "google_drive_file_id", "google_drive_file_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_synced_at", "created_at", "updated_at") SELECT "id", "title", "description", "status", "template_id", "matter_id", "content", "file_path", "file_size", "mime_type", "variable_values", "docx_blob_key", "unsigned_pdf_blob_key", "signed_pdf_blob_key", "field_placements", "signer_count", "notarization_status", "pandadoc_request_id", "requires_notary", "attorney_approved", "attorney_approved_at", "attorney_approved_by", "ready_for_signature", "ready_for_signature_at", "client_id", "signed_at", "signature_data", "viewed_at", "sent_at", "google_drive_file_id", "google_drive_file_url", "google_drive_sync_status", "google_drive_sync_error", "google_drive_synced_at", "created_at", "updated_at" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_documents_client_id` ON `documents` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_matter_id` ON `documents` (`matter_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_status` ON `documents` (`status`);