PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`location` text,
	`notes` text,
	`pre_call_notes` text,
	`call_notes` text,
	`call_notes_updated_at` integer,
	`client_id` text,
	`google_calendar_event_id` text,
	`google_calendar_email` text,
	`matter_id` text,
	`appointment_type` text DEFAULT 'MEETING',
	`attendee_ids` text,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_appointments`("id", "title", "description", "start_time", "end_time", "status", "location", "notes", "pre_call_notes", "call_notes", "call_notes_updated_at", "client_id", "created_at", "updated_at") SELECT "id", "title", "description", "start_time", "end_time", "status", "location", "notes", "pre_call_notes", "call_notes", "call_notes_updated_at", "client_id", "created_at", "updated_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `public_bookings` ADD `selected_slot_start` integer;--> statement-breakpoint
ALTER TABLE `public_bookings` ADD `selected_slot_end` integer;--> statement-breakpoint
ALTER TABLE `public_bookings` ADD `timezone` text;