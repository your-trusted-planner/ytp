ALTER TABLE `form_submissions` ADD `utm_source` text;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD `utm_medium` text;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD `utm_campaign` text;--> statement-breakpoint
ALTER TABLE `forms` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `marital_status` text;