ALTER TABLE "users" ADD COLUMN "username" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");