ALTER TABLE `documents` ADD `field_placements` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `signer_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `signature_sessions` ADD `signer_role` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `signature_sessions` ADD `field_values` text;