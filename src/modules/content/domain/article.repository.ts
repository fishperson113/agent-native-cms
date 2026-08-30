import type { ArticleId, TenantId } from "@/shared/kernel/identifiers";

import type { ArticleSlug } from "./article-slug";
import type { Article } from "./article";

export interface ArticleRepository {
  save(article: Article): Promise<void>;
  findById(tenantId: TenantId, articleId: ArticleId): Promise<Article | null>;
  findBySlug(tenantId: TenantId, slug: ArticleSlug): Promise<Article | null>;
  listByTenant(tenantId: TenantId): Promise<Article[]>;
  delete(tenantId: TenantId, articleId: ArticleId): Promise<void>;
}
