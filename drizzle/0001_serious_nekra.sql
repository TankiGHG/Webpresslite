CREATE TYPE "public"."site_plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."site_role" AS ENUM('owner', 'admin', 'editor', 'author');--> statement-breakpoint
CREATE TABLE "site_members" (
	"site_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "site_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_members_site_id_user_id_pk" PRIMARY KEY("site_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subdomain" text NOT NULL,
	"custom_domain" text,
	"owner_id" text NOT NULL,
	"theme" text DEFAULT 'minimal' NOT NULL,
	"theme_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plan" "site_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_members_user_id_idx" ON "site_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_subdomain_unique" ON "sites" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_custom_domain_unique" ON "sites" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "sites_owner_id_idx" ON "sites" USING btree ("owner_id");