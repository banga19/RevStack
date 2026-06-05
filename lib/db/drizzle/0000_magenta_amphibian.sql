CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`company_name` text,
	`role` text DEFAULT 'member' NOT NULL,
	`terms_accepted` integer DEFAULT false NOT NULL,
	`terms_accepted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`whatsapp` text,
	`industry` text,
	`country` text,
	`status` text DEFAULT 'new' NOT NULL,
	`qualification_score` integer,
	`notes` text,
	`source` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`whatsapp` text,
	`country` text,
	`industry` text,
	`status` text DEFAULT 'onboarding' NOT NULL,
	`onboarding_step` integer DEFAULT 1 NOT NULL,
	`onboarding_notes` text,
	`lead_id` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `retainers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`amount_usd` integer NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text NOT NULL,
	`next_billing_date` text,
	`notes` text,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `followups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer,
	`client_id` integer,
	`channel` text DEFAULT 'whatsapp' NOT NULL,
	`message_body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`sent_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel` text NOT NULL,
	`to` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`lead_id` integer,
	`client_id` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`user_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hermes_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text,
	`output` text,
	`error_message` text,
	`leads_processed` integer,
	`messages_queued` integer,
	`user_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`completed_at` integer
);
