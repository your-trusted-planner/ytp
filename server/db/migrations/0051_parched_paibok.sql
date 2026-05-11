PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Data translation: client_journeys.client_id was users.id, now references clients.id.
-- Rewrite via users.person_id -> clients.person_id, drop orphans (journey rows
-- whose user has no clients record).
UPDATE `client_journeys` SET `client_id` = (
  SELECT `c`.`id` FROM `clients` `c`
  INNER JOIN `users` `u` ON `u`.`person_id` = `c`.`person_id`
  WHERE `u`.`id` = `client_journeys`.`client_id`
) WHERE EXISTS (
  SELECT 1 FROM `clients` `c`
  INNER JOIN `users` `u` ON `u`.`person_id` = `c`.`person_id`
  WHERE `u`.`id` = `client_journeys`.`client_id`
);--> statement-breakpoint
DELETE FROM `client_journeys` WHERE `client_id` NOT IN (SELECT `id` FROM `clients`);--> statement-breakpoint
CREATE TABLE `__new_client_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`matter_id` text,
	`catalog_id` text,
	`journey_id` text NOT NULL,
	`current_step_id` text,
	`status` text DEFAULT 'NOT_STARTED' NOT NULL,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`selected_catalog_id` text,
	`started_at` integer,
	`completed_at` integer,
	`paused_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_step_id`) REFERENCES `journey_steps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selected_catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`,`catalog_id`) REFERENCES `matters_to_services`(`matter_id`,`catalog_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_journeys`("id", "client_id", "matter_id", "catalog_id", "journey_id", "current_step_id", "status", "priority", "selected_catalog_id", "started_at", "completed_at", "paused_at", "created_at", "updated_at") SELECT "id", "client_id", "matter_id", "catalog_id", "journey_id", "current_step_id", "status", "priority", "selected_catalog_id", "started_at", "completed_at", "paused_at", "created_at", "updated_at" FROM `client_journeys`;--> statement-breakpoint
DROP TABLE `client_journeys`;--> statement-breakpoint
ALTER TABLE `__new_client_journeys` RENAME TO `client_journeys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;