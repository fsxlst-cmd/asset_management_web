CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
ALTER TABLE `ledger_entries` ADD `category_id` text REFERENCES categories(id);
--> statement-breakpoint
-- Category is required on new income/expense entries. Existing rows predate categories,
-- so seed a system "Other" per kind and backfill, ensuring no historical row is left untagged.
INSERT OR IGNORE INTO `categories` (`id`, `name`, `kind`, `archived_at`) VALUES ('cat_other_income', 'Other', 'income', NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `name`, `kind`, `archived_at`) VALUES ('cat_other_expense', 'Other', 'expense', NULL);
--> statement-breakpoint
UPDATE `ledger_entries` SET `category_id` = 'cat_other_income' WHERE `type` = 'income' AND `category_id` IS NULL;
--> statement-breakpoint
UPDATE `ledger_entries` SET `category_id` = 'cat_other_expense' WHERE `type` = 'expense' AND `category_id` IS NULL;