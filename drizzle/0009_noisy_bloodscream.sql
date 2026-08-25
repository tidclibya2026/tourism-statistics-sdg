CREATE TABLE `dependencyReviewSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`environment` enum('staging','production') NOT NULL DEFAULT 'staging',
	`enabled` int NOT NULL DEFAULT 0,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dependencyReviewSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `dependency_review_schedule_task_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE INDEX `dependency_review_schedule_environment_idx` ON `dependencyReviewSchedules` (`environment`);