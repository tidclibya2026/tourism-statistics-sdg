CREATE TABLE `administrativeMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`canManageRoles` int NOT NULL DEFAULT 0,
	`canApproveReleases` int NOT NULL DEFAULT 0,
	`canReviewSecurity` int NOT NULL DEFAULT 0,
	`grantedBy` int,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `administrativeMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `administrative_members_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `administrativeMembers` ADD CONSTRAINT `administrativeMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `administrativeMembers` ADD CONSTRAINT `administrativeMembers_grantedBy_users_id_fk` FOREIGN KEY (`grantedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `administrative_members_status_idx` ON `administrativeMembers` (`status`);