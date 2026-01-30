CREATE TABLE `client_billing_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`hourly_rate` integer,
	`user_rates` text,
	`notes` text,
	`effective_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_billing_rates_client_id_unique` ON `client_billing_rates` (`client_id`);--> statement-breakpoint
CREATE TABLE `matter_billing_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`matter_id` text NOT NULL,
	`hourly_rate` integer,
	`user_rates` text,
	`notes` text,
	`effective_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matter_billing_rates_matter_id_unique` ON `matter_billing_rates` (`matter_id`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`matter_id` text NOT NULL,
	`hours` text NOT NULL,
	`description` text NOT NULL,
	`work_date` integer NOT NULL,
	`is_billable` integer DEFAULT true,
	`hourly_rate` integer,
	`amount` integer,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`invoice_id` text,
	`invoice_line_item_id` text,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`line_number` integer NOT NULL,
	`catalog_id` text,
	`description` text NOT NULL,
	`quantity` text DEFAULT '1' NOT NULL,
	`unit_price` integer NOT NULL,
	`amount` integer NOT NULL,
	`item_type` text DEFAULT 'SERVICE' NOT NULL,
	`time_entry_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invoice_line_items`("id", "invoice_id", "line_number", "catalog_id", "description", "quantity", "unit_price", "amount", "item_type", "time_entry_id", "created_at") SELECT "id", "invoice_id", "line_number", "catalog_id", "description", "quantity", "unit_price", "amount", "item_type", NULL, "created_at" FROM `invoice_line_items`;--> statement-breakpoint
DROP TABLE `invoice_line_items`;--> statement-breakpoint
ALTER TABLE `__new_invoice_line_items` RENAME TO `invoice_line_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `default_hourly_rate` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `default_hourly_rate` integer;