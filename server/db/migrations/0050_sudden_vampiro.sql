PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Data translation: appointments.client_id was users.id, now references clients.id.
-- Rewrite via users.person_id -> clients.person_id, drop orphans.
UPDATE `appointments` SET `client_id` = (
  SELECT `c`.`id` FROM `clients` `c`
  INNER JOIN `users` `u` ON `u`.`person_id` = `c`.`person_id`
  WHERE `u`.`id` = `appointments`.`client_id`
) WHERE `client_id` IS NOT NULL AND EXISTS (
  SELECT 1 FROM `clients` `c`
  INNER JOIN `users` `u` ON `u`.`person_id` = `c`.`person_id`
  WHERE `u`.`id` = `appointments`.`client_id`
);--> statement-breakpoint
UPDATE `appointments` SET `client_id` = NULL WHERE `client_id` IS NOT NULL AND `client_id` NOT IN (SELECT `id` FROM `clients`);--> statement-breakpoint
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`location` text,
	`location_config` text,
	`room_id` text,
	`video_meeting_id` text,
	`notes` text,
	`pre_call_notes` text,
	`call_notes` text,
	`call_notes_updated_at` integer,
	`client_id` text,
	`google_calendar_event_id` text,
	`google_calendar_email` text,
	`matter_id` text,
	`appointment_type` text DEFAULT 'MEETING',
	`appointment_type_id` text,
	`attendee_ids` text,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_type_id`) REFERENCES `appointment_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_appointments`("id", "title", "description", "start_time", "end_time", "status", "location", "location_config", "room_id", "video_meeting_id", "notes", "pre_call_notes", "call_notes", "call_notes_updated_at", "client_id", "google_calendar_event_id", "google_calendar_email", "matter_id", "appointment_type", "appointment_type_id", "attendee_ids", "created_by_id", "created_at", "updated_at") SELECT "id", "title", "description", "start_time", "end_time", "status", "location", "location_config", "room_id", "video_meeting_id", "notes", "pre_call_notes", "call_notes", "call_notes_updated_at", "client_id", "google_calendar_event_id", "google_calendar_email", "matter_id", "appointment_type", "appointment_type_id", "attendee_ids", "created_by_id", "created_at", "updated_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;