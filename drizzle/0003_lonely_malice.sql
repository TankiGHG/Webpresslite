CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"key" text NOT NULL,
	"mime" text NOT NULL,
	"file_name" text NOT NULL,
	"width" integer,
	"height" integer,
	"size" integer DEFAULT 0 NOT NULL,
	"alt" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_key_unique" ON "media" USING btree ("key");--> statement-breakpoint
CREATE INDEX "media_site_created_idx" ON "media" USING btree ("site_id","created_at");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;