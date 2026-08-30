import type {
  ArticlePresentationRow,
  NewArticlePresentationRow,
} from "@/infrastructure/database/schema";
import { ArticlePresentation } from "@/modules/presentation/domain/article-presentation";
import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";

export class ArticlePresentationPersistenceMapper {
  static toDomain(row: ArticlePresentationRow): ArticlePresentation {
    return ArticlePresentation.reconstitute({
      id: articlePresentationId(row.id),
      tenantId: tenantId(row.tenantId),
      articleId: articleId(row.articleId),
      sourceCode: row.sourceCode,
      compiledCode: row.compiledCode ?? undefined,
      status: row.status,
      failureReason: row.failureReason ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(
    presentation: ArticlePresentation,
  ): NewArticlePresentationRow {
    const snapshot = presentation.toSnapshot();
    return {
      id: snapshot.id,
      tenantId: snapshot.tenantId,
      articleId: snapshot.articleId,
      sourceCode: snapshot.sourceCode,
      compiledCode: snapshot.compiledCode ?? null,
      status: snapshot.status,
      failureReason: snapshot.failureReason ?? null,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  }
}
