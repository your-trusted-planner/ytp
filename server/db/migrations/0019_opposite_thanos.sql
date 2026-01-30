ALTER TABLE `client_billing_rates` ADD `attorney_rate` integer;--> statement-breakpoint
ALTER TABLE `client_billing_rates` ADD `staff_rate` integer;--> statement-breakpoint
ALTER TABLE `client_billing_rates` DROP COLUMN `hourly_rate`;--> statement-breakpoint
ALTER TABLE `matter_billing_rates` ADD `attorney_rate` integer;--> statement-breakpoint
ALTER TABLE `matter_billing_rates` ADD `staff_rate` integer;--> statement-breakpoint
ALTER TABLE `matter_billing_rates` DROP COLUMN `hourly_rate`;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `default_attorney_rate` integer;--> statement-breakpoint
ALTER TABLE `service_catalog` ADD `default_staff_rate` integer;--> statement-breakpoint
ALTER TABLE `service_catalog` DROP COLUMN `default_hourly_rate`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `default_hourly_rate`;