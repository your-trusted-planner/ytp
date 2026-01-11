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
CREATE UNIQUE INDEX `signature_sessions_signing_token_unique` ON `signature_sessions` (`signing_token`);