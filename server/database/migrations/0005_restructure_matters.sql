ALTER TABLE `matters` RENAME TO `service_catalog`;
CREATE TABLE `matters` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`title` text NOT NULL,
	`matter_number` text,
	`description` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`contract_date` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`matter_id` text NOT NULL,
	`catalog_id` text NOT NULL,
	`journey_id` text,
	`engagement_letter_doc_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`renewal_date` integer,
	`total_paid` integer DEFAULT 0 NOT NULL,
	`fee` integer NOT NULL,
	`payment_status` text DEFAULT 'UNPAID' NOT NULL,
	`assigned_attorney_id` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`engagement_letter_doc_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_attorney_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
DROP TABLE `client_matters`;
ALTER TABLE `journeys` RENAME COLUMN `matter_id` TO `service_catalog_id`;
ALTER TABLE `questionnaires` RENAME COLUMN `matter_id` TO `service_catalog_id`;
ALTER TABLE `documents` RENAME COLUMN `matter_id` TO `service_catalog_id`;
ALTER TABLE `documents` ADD COLUMN `service_id` text REFERENCES `services`(`id`);
ALTER TABLE `documents` ADD COLUMN `matter_id` text REFERENCES `matters`(`id`);
