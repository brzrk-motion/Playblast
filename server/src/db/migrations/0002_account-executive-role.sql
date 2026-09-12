PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`invited_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`studio_id`) REFERENCES `studios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "invitations_role_check" CHECK("__new_invitations"."role" IN ('account_executive', 'creative', 'proofing')),
	CONSTRAINT "invitations_status_check" CHECK("__new_invitations"."status" IN ('pending', 'accepted', 'expired', 'revoked', 'delivery_failed'))
);
--> statement-breakpoint
INSERT INTO `__new_invitations`("id", "studio_id", "email", "email_normalized", "name", "role", "token_hash", "status", "expires_at", "invited_by_user_id", "created_at", "updated_at") SELECT "id", "studio_id", "email", "email_normalized", "name", "role", "token_hash", "status", "expires_at", "invited_by_user_id", "created_at", "updated_at" FROM `invitations`;--> statement-breakpoint
DROP TABLE `invitations`;--> statement-breakpoint
ALTER TABLE `__new_invitations` RENAME TO `invitations`;--> statement-breakpoint
CREATE INDEX `invitations_studio_id_idx` ON `invitations` (`studio_id`);--> statement-breakpoint
CREATE INDEX `invitations_email_normalized_idx` ON `invitations` (`email_normalized`);--> statement-breakpoint
CREATE INDEX `invitations_status_idx` ON `invitations` (`status`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`password_hash` text,
	`role` text NOT NULL,
	`disabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`studio_id`) REFERENCES `studios`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" IN ('admin', 'account_executive', 'creative', 'proofing'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "studio_id", "name", "email", "email_normalized", "password_hash", "role", "disabled", "created_at", "updated_at") SELECT "id", "studio_id", "name", "email", "email_normalized", "password_hash", "role", "disabled", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_normalized_unique` ON `users` (`email_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_studio_email_unique` ON `users` (`studio_id`,`email_normalized`);--> statement-breakpoint
CREATE INDEX `users_studio_id_idx` ON `users` (`studio_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
