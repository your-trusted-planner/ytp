ALTER TABLE `form_submissions` ADD `status` text DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD `last_section_index` integer DEFAULT 0 NOT NULL;