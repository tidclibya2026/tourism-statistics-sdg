CREATE TABLE `supportRequestAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supportRequestId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(700) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportRequestAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportRequestReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supportRequestId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportRequestReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supportRequestAttachments` ADD CONSTRAINT `supportRequestAttachments_supportRequestId_supportRequests_id_fk` FOREIGN KEY (`supportRequestId`) REFERENCES `supportRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportRequestAttachments` ADD CONSTRAINT `supportRequestAttachments_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportRequestReplies` ADD CONSTRAINT `supportRequestReplies_supportRequestId_supportRequests_id_fk` FOREIGN KEY (`supportRequestId`) REFERENCES `supportRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportRequestReplies` ADD CONSTRAINT `supportRequestReplies_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `support_attachments_request_idx` ON `supportRequestAttachments` (`supportRequestId`);--> statement-breakpoint
CREATE INDEX `support_attachments_uploader_idx` ON `supportRequestAttachments` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `support_replies_request_idx` ON `supportRequestReplies` (`supportRequestId`);--> statement-breakpoint
CREATE INDEX `support_replies_author_idx` ON `supportRequestReplies` (`authorUserId`);