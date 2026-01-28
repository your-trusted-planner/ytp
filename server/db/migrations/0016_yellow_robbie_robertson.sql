PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_estate_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`grantor_person_id_1` text NOT NULL,
	`grantor_person_id_2` text,
	`plan_type` text NOT NULL,
	`plan_name` text,
	`current_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`effective_date` integer,
	`last_amended_at` integer,
	`administration_started_at` integer,
	`closed_at` integer,
	`creation_matter_id` text,
	`wealthcounsel_client_id` text,
	`import_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grantor_person_id_1`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grantor_person_id_2`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creation_matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_estate_plans`("id", "grantor_person_id_1", "grantor_person_id_2", "plan_type", "plan_name", "current_version", "status", "effective_date", "last_amended_at", "administration_started_at", "closed_at", "creation_matter_id", "wealthcounsel_client_id", "import_metadata", "created_at", "updated_at") SELECT "id", "primary_person_id", "secondary_person_id", "plan_type", "plan_name", "current_version", "status", "effective_date", "last_amended_at", "administration_started_at", "closed_at", "creation_matter_id", "wealthcounsel_client_id", "import_metadata", "created_at", "updated_at" FROM `estate_plans`;--> statement-breakpoint
DROP TABLE `estate_plans`;--> statement-breakpoint
ALTER TABLE `__new_estate_plans` RENAME TO `estate_plans`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
