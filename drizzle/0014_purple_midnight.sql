CREATE TABLE `documentAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` enum('document_download','documentation_zip_export','report_signed','pki_signature_attempt') NOT NULL,
	`outcome` enum('success','denied','failed') NOT NULL,
	`resource` varchar(255) NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `documentAuditEvents` ADD CONSTRAINT `documentAuditEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `document_audit_actor_idx` ON `documentAuditEvents` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `document_audit_action_idx` ON `documentAuditEvents` (`action`);--> statement-breakpoint
CREATE INDEX `document_audit_created_idx` ON `documentAuditEvents` (`createdAt`);