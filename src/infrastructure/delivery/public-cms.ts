import "server-only";

import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import { GetPublishedArticleByIdHandler } from "@/modules/content/application/get-published-article-by-id/get-published-article-by-id.handler";
import { ListPublishedArticlesHandler } from "@/modules/content/application/list-published-articles/list-published-articles.handler";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { DrizzleArticlePresentationRepository } from "@/modules/presentation/infrastructure/persistence/drizzle-article-presentation.repository";
import { GetActivePresentationArtifactHandler } from "@/modules/runtime/application/get-active-presentation-artifact/get-active-presentation-artifact.handler";

async function withDeliveryHandlers<T>(
  work: (handlers: {
    getArticle: GetPublishedArticleByIdHandler;
    listArticles: ListPublishedArticlesHandler;
    getArtifact: GetActivePresentationArtifactHandler;
  }) => Promise<T>,
): Promise<T> {
  const environment = parseEnvironment(process.env);
  const database = createDatabase(environment.DATABASE_URL);
  const articles = new DrizzleArticleRepository(database.db);
  const presentations = new DrizzleArticlePresentationRepository(database.db);
  try {
    return await work({
      getArticle: new GetPublishedArticleByIdHandler(articles),
      listArticles: new ListPublishedArticlesHandler(articles),
      getArtifact: new GetActivePresentationArtifactHandler(
        articles,
        presentations,
      ),
    });
  } finally {
    await database.close();
  }
}

export function listPublicArticles() {
  return withDeliveryHandlers(({ listArticles }) => listArticles.execute());
}

export function getPublicArticle(id: string) {
  return withDeliveryHandlers(({ getArticle }) =>
    getArticle.execute({ articleId: id }),
  );
}

export function getActivePresentationArtifact(id: string) {
  return withDeliveryHandlers(({ getArtifact }) =>
    getArtifact.execute({ articleId: id }),
  );
}
