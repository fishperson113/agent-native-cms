import type {
  ArticleId,
  ArticlePresentationId,
  TenantId,
} from "@/shared/kernel/identifiers";

import type { ArticlePresentation } from "./article-presentation";

export interface ArticlePresentationRepository {
  save(presentation: ArticlePresentation): Promise<void>;
  findById(
    tenantId: TenantId,
    presentationId: ArticlePresentationId,
  ): Promise<ArticlePresentation | null>;
  listByArticle(
    tenantId: TenantId,
    articleId: ArticleId,
  ): Promise<ArticlePresentation[]>;
  findActiveByArticle(
    tenantId: TenantId,
    articleId: ArticleId,
  ): Promise<ArticlePresentation | null>;
}
