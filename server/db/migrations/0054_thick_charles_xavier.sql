PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_client_marketing_attribution` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`marketing_source_id` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`referrer_url` text,
	`landing_page` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marketing_source_id`) REFERENCES `marketing_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Data translation: client_id was users.id, now references clients.id.
-- Copy only rows whose user has a corresponding clients record.
INSERT INTO `__new_client_marketing_attribution`("id", "client_id", "marketing_source_id", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer_url", "landing_page", "ip_address", "user_agent", "created_at")
SELECT
  cma."id",
  (SELECT c."id" FROM `clients` c INNER JOIN `users` u ON u."person_id" = c."person_id" WHERE u."id" = cma."client_id") AS client_id_translated,
  cma."marketing_source_id", cma."utm_source", cma."utm_medium", cma."utm_campaign", cma."utm_content", cma."utm_term",
  cma."referrer_url", cma."landing_page", cma."ip_address", cma."user_agent", cma."created_at"
FROM `client_marketing_attribution` cma
WHERE EXISTS (
  SELECT 1 FROM `clients` c INNER JOIN `users` u ON u."person_id" = c."person_id"
  WHERE u."id" = cma."client_id"
);--> statement-breakpoint
DROP TABLE `client_marketing_attribution`;--> statement-breakpoint
ALTER TABLE `__new_client_marketing_attribution` RENAME TO `client_marketing_attribution`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `client_marketing_attribution_client_id_unique` ON `client_marketing_attribution` (`client_id`);