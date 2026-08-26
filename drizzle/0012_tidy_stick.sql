CREATE TABLE `supportNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supportRequestId` int NOT NULL,
	`type` enum('reply','status','escalation') NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` varchar(600) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supportNotifications` ADD CONSTRAINT `supportNotifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportNotifications` ADD CONSTRAINT `supportNotifications_supportRequestId_supportRequests_id_fk` FOREIGN KEY (`supportRequestId`) REFERENCES `supportRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `support_notifications_user_read_idx` ON `supportNotifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `support_notifications_request_idx` ON `supportNotifications` (`supportRequestId`);