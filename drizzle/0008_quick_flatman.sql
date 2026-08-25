CREATE TABLE `dependencyReviewRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger` enum('manual','scheduled') NOT NULL,
	`status` enum('completed','failed') NOT NULL,
	`criticalCount` int NOT NULL DEFAULT 0,
	`highCount` int NOT NULL DEFAULT 0,
	`moderateCount` int NOT NULL DEFAULT 0,
	`lowCount` int NOT NULL DEFAULT 0,
	`summary` text NOT NULL,
	`errorMessage` varchar(1000),
	`initiatedBy` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `dependencyReviewRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dependencyReviewRuns` ADD CONSTRAINT `dependencyReviewRuns_initiatedBy_users_id_fk` FOREIGN KEY (`initiatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `dependency_review_started_idx` ON `dependencyReviewRuns` (`startedAt`);--> statement-breakpoint
CREATE INDEX `dependency_review_status_idx` ON `dependencyReviewRuns` (`status`);