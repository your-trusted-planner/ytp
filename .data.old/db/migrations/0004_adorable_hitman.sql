CREATE TABLE `uploaded_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`blob_path` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`content_text` text,
	`content_html` text,
	`paragraph_count` integer,
	`error_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`file_size` integer,
	`mime_type` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` integer,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
