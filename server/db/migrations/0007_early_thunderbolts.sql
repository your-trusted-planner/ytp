CREATE TABLE `notice_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`notice_id` text NOT NULL,
	`user_id` text,
	`target_role` text,
	`read_at` integer,
	`dismissed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`severity` text DEFAULT 'INFO' NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`action_url` text,
	`action_label` text,
	`metadata` text,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
