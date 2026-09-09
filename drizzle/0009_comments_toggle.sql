ALTER TABLE "posts" ADD COLUMN "comments_enabled" boolean;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "comments_enabled" boolean DEFAULT true NOT NULL;
