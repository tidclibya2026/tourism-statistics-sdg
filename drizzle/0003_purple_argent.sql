CREATE TABLE `publicationDestinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` enum('visit_libya','libya_atlas') NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`deliveryMode` enum('api_contract') NOT NULL DEFAULT 'api_contract',
	`status` enum('draft','ready','paused') NOT NULL DEFAULT 'draft',
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publicationDestinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `publication_destinations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `spatialAreas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('region','city') NOT NULL,
	`parentId` int,
	`geographicSource` varchar(500),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spatialAreas_id` PRIMARY KEY(`id`),
	CONSTRAINT `spatial_areas_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `spatialObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spatialAreaId` int NOT NULL,
	`indicatorId` int NOT NULL,
	`year` int NOT NULL,
	`period` enum('annual','quarterly') NOT NULL,
	`quarter` enum('annual','Q1','Q2','Q3','Q4') NOT NULL DEFAULT 'annual',
	`value` decimal(18,4) NOT NULL,
	`targetValue` decimal(18,4),
	`source` varchar(500),
	`verificationStatus` enum('draft','reviewed','approved','rejected') NOT NULL DEFAULT 'draft',
	`notes` text,
	`enteredBy` int,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spatialObservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `spatial_observations_period_unique` UNIQUE(`spatialAreaId`,`indicatorId`,`year`,`period`,`quarter`)
);
--> statement-breakpoint
ALTER TABLE `publicationDestinations` ADD CONSTRAINT `publicationDestinations_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spatialObservations` ADD CONSTRAINT `spatialObservations_spatialAreaId_spatialAreas_id_fk` FOREIGN KEY (`spatialAreaId`) REFERENCES `spatialAreas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spatialObservations` ADD CONSTRAINT `spatialObservations_indicatorId_indicators_id_fk` FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spatialObservations` ADD CONSTRAINT `spatialObservations_enteredBy_users_id_fk` FOREIGN KEY (`enteredBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spatialObservations` ADD CONSTRAINT `spatialObservations_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `spatial_areas_parent_idx` ON `spatialAreas` (`parentId`);--> statement-breakpoint
CREATE INDEX `spatial_areas_type_idx` ON `spatialAreas` (`type`);--> statement-breakpoint
CREATE INDEX `spatial_observations_area_idx` ON `spatialObservations` (`spatialAreaId`);--> statement-breakpoint
CREATE INDEX `spatial_observations_indicator_idx` ON `spatialObservations` (`indicatorId`);--> statement-breakpoint
CREATE INDEX `spatial_observations_status_idx` ON `spatialObservations` (`verificationStatus`);