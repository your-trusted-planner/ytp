PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Data translation: signer_id was users.id, now references people.id.
-- Rewrite via users.person_id, then drop orphans whose user has no person.
UPDATE `signature_sessions` SET `signer_id` = (
  SELECT `u`.`person_id` FROM `users` `u`
  WHERE `u`.`id` = `signature_sessions`.`signer_id` AND `u`.`person_id` IS NOT NULL
) WHERE EXISTS (
  SELECT 1 FROM `users` `u`
  WHERE `u`.`id` = `signature_sessions`.`signer_id` AND `u`.`person_id` IS NOT NULL
);--> statement-breakpoint
DELETE FROM `signature_sessions` WHERE `signer_id` NOT IN (SELECT `id` FROM `people`);--> statement-breakpoint
CREATE TABLE `__new_signature_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`signer_id` text NOT NULL,
	`action_item_id` text,
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
	`signer_role` integer DEFAULT 1 NOT NULL,
	`field_values` text,
	`signature_data` text,
	`signature_hash` text,
	`signed_at` integer,
	`signature_certificate` text,
	`terms_accepted_at` integer,
	`terms_version` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`signer_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_signature_sessions`("id", "document_id", "signer_id", "action_item_id", "signature_tier", "status", "identity_verified", "identity_verification_method", "identity_verified_at", "identity_provider", "identity_reference_id", "signing_token", "token_expires_at", "ip_address", "user_agent", "geolocation", "signer_role", "field_values", "signature_data", "signature_hash", "signed_at", "signature_certificate", "terms_accepted_at", "terms_version", "created_at", "updated_at") SELECT "id", "document_id", "signer_id", "action_item_id", "signature_tier", "status", "identity_verified", "identity_verification_method", "identity_verified_at", "identity_provider", "identity_reference_id", "signing_token", "token_expires_at", "ip_address", "user_agent", "geolocation", "signer_role", "field_values", "signature_data", "signature_hash", "signed_at", "signature_certificate", "terms_accepted_at", "terms_version", "created_at", "updated_at" FROM `signature_sessions`;--> statement-breakpoint
DROP TABLE `signature_sessions`;--> statement-breakpoint
ALTER TABLE `__new_signature_sessions` RENAME TO `signature_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `signature_sessions_signing_token_unique` ON `signature_sessions` (`signing_token`);