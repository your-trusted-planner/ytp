-- Migration: Transform notes table to support multiple entity types
-- Old schema: client_id (FK to users)
-- New schema: entity_type, entity_id, created_by

PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Migrate existing notes: client_id becomes entity_id with entity_type='client'
-- created_by defaults to the client_id (will need manual fix for real data)
INSERT INTO `__new_notes`("id", "content", "entity_type", "entity_id", "created_by", "created_at", "updated_at")
SELECT "id", "content", 'client', "client_id", "client_id", "created_at", "updated_at" FROM `notes`;
--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
