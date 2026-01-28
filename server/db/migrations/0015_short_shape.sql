CREATE TABLE `ancillary_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`person_id` text NOT NULL,
	`document_type` text NOT NULL,
	`title` text,
	`execution_date` integer,
	`jurisdiction` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `estate_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `plan_roles` ADD `for_person_id` text REFERENCES people(id);--> statement-breakpoint
ALTER TABLE `plan_roles` ADD `will_id` text REFERENCES wills(id);--> statement-breakpoint
ALTER TABLE `plan_roles` ADD `ancillary_document_id` text REFERENCES ancillary_documents(id);--> statement-breakpoint
ALTER TABLE `wills` ADD `person_id` text REFERENCES people(id);