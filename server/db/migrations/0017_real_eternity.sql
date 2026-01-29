CREATE TABLE `client_trust_ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`trust_account_id` text NOT NULL,
	`client_id` text NOT NULL,
	`matter_id` text,
	`balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trust_account_id`) REFERENCES `trust_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`line_number` integer NOT NULL,
	`catalog_id` text,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer NOT NULL,
	`amount` integer NOT NULL,
	`item_type` text DEFAULT 'SERVICE' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`matter_id` text NOT NULL,
	`client_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax_rate` integer DEFAULT 0,
	`tax_amount` integer DEFAULT 0,
	`discount_amount` integer DEFAULT 0,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`trust_applied` integer DEFAULT 0 NOT NULL,
	`direct_payments` integer DEFAULT 0 NOT NULL,
	`balance_due` integer DEFAULT 0 NOT NULL,
	`issue_date` integer,
	`due_date` integer,
	`sent_at` integer,
	`paid_at` integer,
	`notes` text,
	`terms` text,
	`memo` text,
	`pdf_blob_key` text,
	`pdf_generated_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `trust_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_name` text NOT NULL,
	`account_type` text DEFAULT 'IOLTA' NOT NULL,
	`bank_name` text,
	`account_number_last4` text,
	`routing_number` text,
	`current_balance` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trust_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`trust_account_id` text NOT NULL,
	`client_id` text NOT NULL,
	`matter_id` text,
	`transaction_type` text NOT NULL,
	`amount` integer NOT NULL,
	`running_balance` integer NOT NULL,
	`description` text NOT NULL,
	`reference_number` text,
	`check_number` text,
	`invoice_id` text,
	`payment_id` text,
	`transaction_date` integer NOT NULL,
	`cleared_date` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trust_account_id`) REFERENCES `trust_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `fund_source` text DEFAULT 'DIRECT' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `trust_transaction_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `invoice_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `check_number` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `reference_number` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `recorded_by` text REFERENCES users(id);