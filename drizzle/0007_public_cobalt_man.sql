CREATE TABLE `administrativeAccessEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('member_granted','member_updated','member_suspended','role_updated') NOT NULL,
	`detail` varchar(500),
	`actedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `administrativeAccessEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `administrativeAccessEvents` ADD CONSTRAINT `administrativeAccessEvents_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `administrativeAccessEvents` ADD CONSTRAINT `administrativeAccessEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `administrative_access_target_idx` ON `administrativeAccessEvents` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `administrative_access_actor_idx` ON `administrativeAccessEvents` (`actorUserId`);