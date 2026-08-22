ALTER TABLE `spatialAreas` ADD `boundaryReferenceTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `spatialAreas` ADD `boundaryReferenceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `spatialAreas` ADD `boundaryStatus` enum('not_provided','submitted','verified') DEFAULT 'not_provided' NOT NULL;--> statement-breakpoint
ALTER TABLE `spatialAreas` ADD `boundaryVerifiedBy` int;--> statement-breakpoint
ALTER TABLE `spatialAreas` ADD `boundaryVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `spatialAreas` ADD CONSTRAINT `spatialAreas_boundaryVerifiedBy_users_id_fk` FOREIGN KEY (`boundaryVerifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;