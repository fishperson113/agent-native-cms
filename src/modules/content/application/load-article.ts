import { ArticleNotFoundError } from "../domain/article.errors";
import type { ArticleRepository } from "../domain/article.repository";
import type { Article } from "../domain/article";
import type { ArticleId, TenantId } from "@/shared/kernel/identifiers";

export async function loadArticle(
  repository: ArticleRepository,
  tenantId: TenantId,
  articleId: ArticleId,
): Promise<Article> {
  const article = await repository.findById(tenantId, articleId);
  if (!article) {
    throw new ArticleNotFoundError();
  }
  return article;
}
