CREATE TABLE "page_views" (
	"site_id" text NOT NULL,
	"post_id" text,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_key" UNIQUE NULLS NOT DISTINCT("site_id","day","post_id")
);
--> statement-breakpoint
CREATE TABLE "site_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "site_role" NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "domain_verification_token" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "domain_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_invitations" ADD CONSTRAINT "site_invitations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_invitations" ADD CONSTRAINT "site_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_views_site_day_idx" ON "page_views" USING btree ("site_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "site_invitations_token_unique" ON "site_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "site_invitations_site_idx" ON "site_invitations" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_invitations_email_idx" ON "site_invitations" USING btree ("email");