import "server-only";

import { parseMcpEnvironment } from "@/integrations/mcp/mcp-environment";
import { createDatabase } from "@/infrastructure/database/client";
import { GetPublishedArticleBySlugHandler } from "@/modules/content/application/get-published-article-by-slug/get-published-article-by-slug.handler";
import { ListPublishedArticlesHandler } from "@/modules/content/application/list-published-articles/list-published-articles.handler";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { DrizzleArticlePresentationRepository } from "@/modules/presentation/infrastructure/persistence/drizzle-article-presentation.repository";
import { GetActivePresentationArtifactHandler } from "@/modules/runtime/application/get-active-presentation-artifact/get-active-presentation-artifact.handler";

async function withDeliveryHandlers<T>(
  work: (handlers: {
    getArticle: GetPublishedArticleBySlugHandler;
    listArticles: ListPublishedArticlesHandler;
    getArtifact: GetActivePresentationArtifactHandler;
    tenantId: string;
  }) => Promise<T>,
): Promise<T> {
  const environment = parseMcpEnvironment(process.env);
  const database = createDatabase(environment.DATABASE_URL);
  const articles = new DrizzleArticleRepository(database.db);
  const presentations = new DrizzleArticlePresentationRepository(database.db);
  try {
    return await work({
      getArticle: new GetPublishedArticleBySlugHandler(articles),
      listArticles: new ListPublishedArticlesHandler(articles),
      getArtifact: new GetActivePresentationArtifactHandler(
        articles,
        presentations,
      ),
      tenantId: environment.CMS_TENANT_ID,
    });
  } finally {
    await database.close();
  }
}

export function listPublicArticles() {
  return withDeliveryHandlers(({ listArticles, tenantId }) =>
    listArticles.execute({ tenantId }),
  );
}

export function getPublicArticle(slug: string) {
  return withDeliveryHandlers(({ getArticle, tenantId }) =>
    getArticle.execute({ tenantId, slug }),
  );
}

export function getActivePresentationArtifact(slug: string) {
  return withDeliveryHandlers(({ getArtifact, tenantId }) =>
    getArtifact.execute({ tenantId, slug }),
  );
}
