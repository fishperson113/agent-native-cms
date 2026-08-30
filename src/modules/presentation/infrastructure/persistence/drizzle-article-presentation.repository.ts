import { and, asc, eq } from "drizzle-orm";

import type { DatabaseExecutor } from "@/infrastructure/database/client";
import { articlePresentations } from "@/infrastructure/database/schema";
import type { ArticlePresentationRepository } from "@/modules/presentation/domain/article-presentation.repository";
import type { ArticlePresentation } from "@/modules/presentation/domain/article-presentation";
import type {
  ArticleId,
  ArticlePresentationId,
  TenantId,
} from "@/shared/kernel/identifiers";

import { ArticlePresentationPersistenceMapper } from "./article-presentation-persistence.mapper";

export class DrizzleArticlePresentationRepository
  implements ArticlePresentationRepository
{
  constructor(private readonly db: DatabaseExecutor) {}

  async save(presentation: ArticlePresentation): Promise<void> {
    const record = ArticlePresentationPersistenceMapper.toPersistence(presentation);
    await this.db
      .insert(articlePresentations)
      .values(record)
      .onConflictDoUpdate({
        target: articlePresentations.id,
        set: {
          sourceCode: record.sourceCode,
          compiledCode: record.compiledCode,
          status: record.status,
          failureReason: record.failureReason,
          updatedAt: record.updatedAt,
        },
      });
  }

  async findById(
    tenantId: TenantId,
    presentationId: ArticlePresentationId,
  ): Promise<ArticlePresentation | null> {
    const [row] = await this.db
      .select()
      .from(articlePresentations)
      .where(
        and(
          eq(articlePresentations.tenantId, tenantId),
          eq(articlePresentations.id, presentationId),
        ),
      )
      .limit(1);

    return row ? ArticlePresentationPersistenceMapper.toDomain(row) : null;
  }

  async listByArticle(
    tenantId: TenantId,
    articleId: ArticleId,
  ): Promise<ArticlePresentation[]> {
    const rows = await this.db
      .select()
      .from(articlePresentations)
      .where(
        and(
          eq(articlePresentations.tenantId, tenantId),
          eq(articlePresentations.articleId, articleId),
        ),
      )
      .orderBy(asc(articlePresentations.createdAt));

    return rows.map(ArticlePresentationPersistenceMapper.toDomain);
  }

  async findActiveByArticle(
    tenantId: TenantId,
    articleId: ArticleId,
  ): Promise<ArticlePresentation | null> {
    const [row] = await this.db
      .select()
      .from(articlePresentations)
      .where(
        and(
          eq(articlePresentations.tenantId, tenantId),
          eq(articlePresentations.articleId, articleId),
          eq(articlePresentations.status, "active"),
        ),
      )
      .limit(1);

    return row ? ArticlePresentationPersistenceMapper.toDomain(row) : null;
  }
}
