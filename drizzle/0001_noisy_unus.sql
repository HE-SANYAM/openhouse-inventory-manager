CREATE TABLE `change_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`unitKey` varchar(255) NOT NULL,
	`eventType` enum('sourced','existing','updated','sold','reappeared') NOT NULL,
	`beforeJson` text,
	`afterJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `change_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`status` enum('confirmed') NOT NULL DEFAULT 'confirmed',
	`unitCount` int NOT NULL,
	`sourceFileCount` int NOT NULL,
	`completenessScore` decimal(5,2) NOT NULL,
	`warningMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`unitKey` varchar(255) NOT NULL,
	`societyName` varchar(255) NOT NULL,
	`unitNumber` varchar(100) NOT NULL,
	`areaSqft` decimal(10,2),
	`configuration` varchar(100),
	`floor` varchar(50),
	`locality` varchar(255),
	`status` varchar(100),
	`askPriceDisplay` varchar(100),
	`askPriceValue` decimal(15,2),
	`isMarkedNew` boolean NOT NULL DEFAULT false,
	`firstSourcedAt` timestamp NOT NULL,
	`lastSeenAt` timestamp NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `inventory_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `snapshot_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snapshot_assets_id` PRIMARY KEY(`id`)
);
