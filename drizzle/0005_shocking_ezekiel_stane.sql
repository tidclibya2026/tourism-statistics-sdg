CREATE TABLE `spatialObservationReviewEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spatialObservationId` int NOT NULL,
	`fromStatus` enum('draft','reviewed','approved','rejected'),
	`toStatus` enum('draft','reviewed','approved','rejected') NOT NULL,
	`note` text,
	`actedBy` int,
	`actedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spatialObservationReviewEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `spatialObservationReviewEvents` ADD CONSTRAINT `spatialObservationReviewEvents_spatialObservationId_spatialObservations_id_fk` FOREIGN KEY (`spatialObservationId`) REFERENCES `spatialObservations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spatialObservationReviewEvents` ADD CONSTRAINT `spatialObservationReviewEvents_actedBy_users_id_fk` FOREIGN KEY (`actedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `spatial_review_events_observation_idx` ON `spatialObservationReviewEvents` (`spatialObservationId`);--> statement-breakpoint
CREATE INDEX `spatial_review_events_status_idx` ON `spatialObservationReviewEvents` (`toStatus`);