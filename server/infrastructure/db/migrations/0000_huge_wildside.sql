CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`institution` text
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`unit_value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `envelopes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`accrual_amount` integer,
	`accrual_period` text,
	`accrual_anchor` integer
);
--> statement-breakpoint
CREATE TABLE `holdings` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`date` integer NOT NULL,
	`note` text,
	`envelope_id` text,
	`source_account_id` text,
	`destination_account_id` text,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`holding_id` text NOT NULL,
	`value` integer NOT NULL,
	`taken_at` integer NOT NULL,
	FOREIGN KEY (`holding_id`) REFERENCES `holdings`(`id`) ON UPDATE no action ON DELETE no action
);
