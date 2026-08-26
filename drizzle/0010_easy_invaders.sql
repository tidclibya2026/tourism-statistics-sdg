CREATE TABLE `helpContentRatings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sectionId` varchar(80) NOT NULL,
	`rating` enum('helpful','not_helpful') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `helpContentRatings_id` PRIMARY KEY(`id`),
	CONSTRAINT `help_ratings_user_section_unique` UNIQUE(`userId`,`sectionId`)
);
--> statement-breakpoint
CREATE TABLE `supportRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleSnapshot` enum('admin','analyst','viewer') NOT NULL,
	`category` enum('question','issue','suggestion') NOT NULL,
	`subject` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `helpContentRatings` ADD CONSTRAINT `helpContentRatings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportRequests` ADD CONSTRAINT `supportRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `help_ratings_section_idx` ON `helpContentRatings` (`sectionId`);--> statement-breakpoint
CREATE INDEX `support_requests_status_idx` ON `supportRequests` (`status`);--> statement-breakpoint
CREATE INDEX `support_requests_user_idx` ON `supportRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `support_requests_created_idx` ON `supportRequests` (`createdAt`);