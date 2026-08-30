CREATE TABLE "article_presentations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"source_code" text NOT NULL,
	"compiled_code" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_presentations" ADD CONSTRAINT "article_presentations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_presentations" ADD CONSTRAINT "article_presentations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_active_presentation_id_article_presentations_id_fk" FOREIGN KEY ("active_presentation_id") REFERENCES "public"."article_presentations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_presentations_tenant" ON "article_presentations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_presentations_article" ON "article_presentations" USING btree ("article_id");
