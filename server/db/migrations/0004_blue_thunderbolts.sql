CREATE TABLE `journeys_to_catalog` (
	`journey_id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`journey_id`, `catalog_id`),
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`journey_type` text DEFAULT 'SERVICE' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`estimated_duration_days` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_journeys`("id", "name", "description", "journey_type", "is_active", "estimated_duration_days", "created_at", "updated_at") SELECT "id", "name", "description", "journey_type", "is_active", "estimated_duration_days", "created_at", "updated_at" FROM `journeys`;--> statement-breakpoint
DROP TABLE `journeys`;--> statement-breakpoint
ALTER TABLE `__new_journeys` RENAME TO `journeys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `client_journeys` ADD `selected_catalog_id` text REFERENCES service_catalog(id);