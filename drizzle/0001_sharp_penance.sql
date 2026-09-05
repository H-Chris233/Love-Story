CREATE TABLE "blob_deletions" (
	"pathname" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD COLUMN "message" jsonb;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD COLUMN "lease_token" uuid;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD COLUMN "first_attempt_at" timestamp with time zone;