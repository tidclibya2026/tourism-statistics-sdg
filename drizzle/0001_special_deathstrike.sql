CREATE TABLE `importIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importJobId` int NOT NULL,
	`rowNumber` int NOT NULL,
	`field` varchar(128),
	`message` varchar(500) NOT NULL,
	`severity` enum('error','warning') NOT NULL DEFAULT 'error',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` enum('Excel','CSV') NOT NULL,
	`status` enum('validating','completed','completed_with_errors','failed') NOT NULL,
	`totalRows` int NOT NULL DEFAULT 0,
	`acceptedRows` int NOT NULL DEFAULT 0,
	`rejectedRows` int NOT NULL DEFAULT 0,
	`submittedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicatorObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicatorId` int NOT NULL,
	`year` int NOT NULL,
	`period` enum('annual','quarterly') NOT NULL,
	`quarter` enum('Q1','Q2','Q3','Q4'),
	`value` decimal(18,4) NOT NULL,
	`targetValue` decimal(18,4),
	`source` varchar(255),
	`verificationStatus` enum('draft','reviewed','approved','rejected') NOT NULL DEFAULT 'draft',
	`notes` text,
	`enteredBy` int,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `indicatorObservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `observations_period_unique` UNIQUE(`indicatorId`,`year`,`period`,`quarter`)
);
--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`axis` enum('اقتصادي','اجتماعي','بيئي') NOT NULL,
	`framework` enum('UNWTO','SDG') NOT NULL,
	`sdgReference` enum('SDG 8','SDG 11','SDG 12','SDG 14','SDG 17'),
	`unit` varchar(128) NOT NULL,
	`calculationMethod` text,
	`officialSource` varchar(255),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `indicators_id` PRIMARY KEY(`id`),
	CONSTRAINT `indicators_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','analyst','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `importIssues` ADD CONSTRAINT `importIssues_importJobId_importJobs_id_fk` FOREIGN KEY (`importJobId`) REFERENCES `importJobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importJobs` ADD CONSTRAINT `importJobs_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicatorObservations` ADD CONSTRAINT `indicatorObservations_indicatorId_indicators_id_fk` FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicatorObservations` ADD CONSTRAINT `indicatorObservations_enteredBy_users_id_fk` FOREIGN KEY (`enteredBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicatorObservations` ADD CONSTRAINT `indicatorObservations_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `import_issues_job_idx` ON `importIssues` (`importJobId`);--> statement-breakpoint
CREATE INDEX `observations_year_idx` ON `indicatorObservations` (`year`);--> statement-breakpoint
CREATE INDEX `observations_status_idx` ON `indicatorObservations` (`verificationStatus`);--> statement-breakpoint
CREATE INDEX `indicators_axis_idx` ON `indicators` (`axis`);--> statement-breakpoint
CREATE INDEX `indicators_framework_idx` ON `indicators` (`framework`);