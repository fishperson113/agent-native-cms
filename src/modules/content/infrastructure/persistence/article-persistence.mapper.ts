import type {
  ArticleRow,
  NewArticleRow,
} from "@/infrastructure/database/schema";
import { Article } from "@/modules/content/domain/article";
import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";

export class ArticlePersistenceMapper {
  static toDomain(row: ArticleRow): Article {
    return Article.reconstitute({
      id: articleId(row.id),
      tenantId: tenantId(row.tenantId),
      title: row.title,
      slug: row.slug,
      markdown: row.markdown,
      status: row.status,
      activePresentationId: row.activePresentationId
        ? articlePresentationId(row.activePresentationId)
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(article: Article): NewArticleRow {
    const snapshot = article.toSnapshot();
    return {
      id: snapshot.id,
      tenantId: snapshot.tenantId,
      title: snapshot.title,
      slug: snapshot.slug,
      markdown: snapshot.markdown,
      status: snapshot.status,
      activePresentationId: snapshot.activePresentationId ?? null,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  }
}
