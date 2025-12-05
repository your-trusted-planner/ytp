PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE _hub_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO _hub_migrations VALUES(1,'0000_small_warhawk','2025-11-15 01:03:14');
INSERT INTO _hub_migrations VALUES(2,'0001_oval_banshee','2025-11-15 01:03:14');
CREATE TABLE _cf_METADATA (
        key INTEGER PRIMARY KEY,
        value BLOB
      );
INSERT INTO _cf_METADATA VALUES(2,77);
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`location` text,
	`notes` text,
	`client_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `client_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date_of_birth` integer,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`spouse_name` text,
	`spouse_email` text,
	`spouse_phone` text,
	`has_minor_children` integer DEFAULT false NOT NULL,
	`children_info` text,
	`business_name` text,
	`business_type` text,
	`has_will` integer DEFAULT false NOT NULL,
	`has_trust` integer DEFAULT false NOT NULL,
	`last_updated` integer,
	`assigned_lawyer_id` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO client_profiles VALUES('aqnpu4ylotjs3aaom35g7mhzl2it0','oy3pcgtcuskr5tgm4499rmhzl2iqf',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,0,0,NULL,'m0bnus2hvunzh6omqa8eumhzl2ing','2025-11-15 01:03:35','2025-11-15 01:03:35');
CREATE TABLE `document_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`folder_id` text,
	`content` text NOT NULL,
	`variables` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`original_file_name` text,
	`file_extension` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL, `requires_notary` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `template_folders`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO document_templates VALUES('ne49pplophfca8ox8f90pmhzl2itc','Simple Will','Basic will template','Will','qp55rtwkn4s6db9t2m4eemhzl2it6','<h1>Last Will and Testament</h1><p>I, {{fullName}}, being of sound mind...</p>','[{"name":"fullName","description":"Full legal name"},{"name":"address","description":"Current address"}]',1,0,NULL,NULL,'2025-11-15 01:03:35','2025-11-15 01:03:35',0);
INSERT INTO document_templates VALUES('degqqy45ek7puqclyoipjmhzl2itj','Engagement Agreement - WAPA','Wyoming Asset Protection Trust engagement letter','Engagement Letter','qp55rtwkn4s6db9t2m4eemhzl2it6','<h1>Engagement Agreement</h1><p>Client: {{clientName}}</p><p>Service: {{serviceName}}</p><p>Fee: {{fee}}</p>','[{"name":"clientName","description":"Client full name"},{"name":"serviceName","description":"Service description"},{"name":"fee","description":"Total fee amount"}]',1,0,NULL,NULL,'2025-11-15 01:03:35','2025-11-15 01:03:35',0);
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`template_id` text,
	`content` text NOT NULL,
	`file_path` text,
	`file_size` integer,
	`mime_type` text,
	`variable_values` text,
	`client_id` text NOT NULL,
	`signed_at` integer,
	`signature_data` text,
	`viewed_at` integer,
	`sent_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL, `matter_id` text REFERENCES matters(id), `requires_notary` integer DEFAULT false NOT NULL, `notarization_status` text, `pandadoc_request_id` text,
	FOREIGN KEY (`template_id`) REFERENCES `document_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `template_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `template_folders`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO template_folders VALUES('qp55rtwkn4s6db9t2m4eemhzl2it6','Estate Planning','Estate planning documents',NULL,0,'2025-11-15 01:03:35','2025-11-15 01:03:35');
CREATE TABLE `client_matters` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`matter_id` text NOT NULL,
	`engagement_letter_doc_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`renewal_date` integer,
	`total_paid` integer DEFAULT 0 NOT NULL,
	`total_price` integer NOT NULL,
	`payment_status` text DEFAULT 'UNPAID' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`engagement_letter_doc_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `matters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`type` text DEFAULT 'SINGLE' NOT NULL,
	`price` integer NOT NULL,
	`duration` text,
	`engagement_letter_id` text,
	`workflow_steps` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`engagement_letter_id`) REFERENCES `document_templates`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO matters VALUES('t142lp262s9hqhu0fh6ykmhzl2itp','Wyoming Asset Protection Trust','Complete trust formation with asset protection','Trust Formation','SINGLE',1850000,NULL,'degqqy45ek7puqclyoipjmhzl2itj',NULL,1,'2025-11-15 01:03:35','2025-11-15 01:03:35');
INSERT INTO matters VALUES('g0zaxuksktdd0xtiz7lcogmhzl2ity','Annual Trust Maintenance','Ongoing trust administration and compliance','Maintenance','RECURRING',50000,'ANNUALLY',NULL,NULL,1,'2025-11-15 01:03:35','2025-11-15 01:03:35');
INSERT INTO matters VALUES('ouxqof4ct2md7lbiwxbpa4mhzl2iu3','LLC Formation - Wyoming','Wyoming LLC formation and setup','Entity Formation','SINGLE',250000,NULL,NULL,NULL,1,'2025-11-15 01:03:35','2025-11-15 01:03:35');
CREATE TABLE `questionnaire_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`questionnaire_id` text NOT NULL,
	`appointment_id` text,
	`user_id` text,
	`responses` text NOT NULL,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `questionnaires` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`matter_id` text,
	`questions` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO questionnaires VALUES('2q5xw0k5iw2y0nnnyrwawmhzl2iu9','Initial Consultation Questionnaire','Pre-consultation questions for prospects',NULL,'[{"id":"q1","type":"text","question":"What is your primary reason for seeking asset protection?","required":true},{"id":"q2","type":"number","question":"Estimated net worth (USD)","required":true},{"id":"q3","type":"select","question":"What type of assets do you need to protect?","options":["Real Estate","Business Assets","Investment Portfolio","Cryptocurrency","Other"],"required":true},{"id":"q4","type":"text","question":"Do you currently have any legal structures in place (trusts, LLCs, etc.)?","required":false},{"id":"q5","type":"select","question":"What is your timeline for implementation?","options":["Immediate (within 1 month)","1-3 months","3-6 months","6+ months"],"required":true}]',1,'2025-11-15 01:03:35','2025-11-15 01:03:35');
CREATE TABLE IF NOT EXISTS "users" (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'PROSPECT' NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`avatar` text,
	`status` text DEFAULT 'PROSPECT' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO users VALUES('m0bnus2hvunzh6omqa8eumhzl2ing','lawyer@yourtrustedplanner.com','$2a$10$SJMJ59LBq9.ZvXhy5ROU4.RPgcDVa3OMlF2SW9VqC3dP3bbEsFKv.','LAWYER','John','Meuli',NULL,NULL,'ACTIVE','2025-11-15 01:03:35','2025-11-15 01:03:35');
INSERT INTO users VALUES('oy3pcgtcuskr5tgm4499rmhzl2iqf','client@test.com','$2a$10$2ylq2zXnAnWlyHIQgon9guEvoYJYMRoRE2HXPXuOP4EZSh.hh6Eoe','CLIENT','Jane','Doe',NULL,NULL,'ACTIVE','2025-11-15 01:03:35','2025-11-15 01:03:35');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('_hub_migrations',2);
CREATE UNIQUE INDEX `client_profiles_user_id_unique` ON `client_profiles` (`user_id`);
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
COMMIT;
