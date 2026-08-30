import { and, asc, eq } from "drizzle-orm";

import type { DatabaseExecutor } from "@/infrastructure/database/client";
import { articles } from "@/infrastructure/database/schema";
import { ArticleSlugAlreadyExistsError } from "@/modules/content/domain/article.errors";
import type { ArticleRepository } from "@/modules/content/domain/article.repository";
import type { ArticleSlug } from "@/modules/content/domain/article-slug";
import type { Article } from "@/modules/content/domain/article";
import type { ArticleId, TenantId } from "@/shared/kernel/identifiers";

import { ArticlePersistenceMapper } from "./article-persistence.mapper";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  return "cause" in error && isUniqueViolation(error.cause);
}

export class DrizzleArticleRepository implements ArticleRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async save(article: Article): Promise<void> {
    const record = ArticlePersistenceMapper.toPersistence(article);

    try {
      await this.db
        .insert(articles)
        .values(record)
        .onConflictDoUpdate({
          target: articles.id,
          set: {
            title: record.title,
            slug: record.slug,
            markdown: record.markdown,
            status: record.status,
            activePresentationId: record.activePresentationId,
            updatedAt: record.updatedAt,
          },
        });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ArticleSlugAlreadyExistsError(record.slug);
      }
      throw error;
    }
  }

  async findById(
    tenantId: TenantId,
    articleId: ArticleId,
  ): Promise<Article | null> {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(
        and(eq(articles.tenantId, tenantId), eq(articles.id, articleId)),
      )
      .limit(1);

    return row ? ArticlePersistenceMapper.toDomain(row) : null;
  }

  async findBySlug(
    tenantId: TenantId,
    slug: ArticleSlug,
  ): Promise<Article | null> {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(
        and(eq(articles.tenantId, tenantId), eq(articles.slug, slug.value)),
      )
      .limit(1);

    return row ? ArticlePersistenceMapper.toDomain(row) : null;
  }

  async listByTenant(tenantId: TenantId): Promise<Article[]> {
    const rows = await this.db
      .select()
      .from(articles)
      .where(eq(articles.tenantId, tenantId))
      .orderBy(asc(articles.createdAt));

    return rows.map(ArticlePersistenceMapper.toDomain);
  }

  async delete(tenantId: TenantId, articleId: ArticleId): Promise<void> {
    await this.db
      .delete(articles)
      .where(
        and(eq(articles.tenantId, tenantId), eq(articles.id, articleId)),
      );
  }
}
