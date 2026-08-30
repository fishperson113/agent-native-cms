ALTER TABLE "article_presentations" DROP CONSTRAINT "article_presentations_article_id_articles_id_fk";
--> statement-breakpoint
ALTER TABLE "article_presentations" ADD CONSTRAINT "article_presentations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;