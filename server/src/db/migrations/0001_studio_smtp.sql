CREATE TABLE `studio_smtp_settings` (
	`studio_id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`username` text,
	`password_encrypted` text NOT NULL,
	`from_email` text NOT NULL,
	`tls_mode` text NOT NULL,
	`instance_url` text NOT NULL,
	`test_verified_at` text,
	`last_test_status` text DEFAULT 'never' NOT NULL,
	`last_test_at` text,
	`last_test_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`studio_id`) REFERENCES `studios`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "studio_smtp_tls_mode_check" CHECK("studio_smtp_settings"."tls_mode" IN ('none', 'starttls', 'tls')),
	CONSTRAINT "studio_smtp_last_test_status_check" CHECK("studio_smtp_settings"."last_test_status" IN ('never', 'success', 'failed'))
);
