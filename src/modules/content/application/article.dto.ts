import type { Article } from "../domain/article";

export type ArticleDto = {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  markdown: string;
  status: "draft" | "published";
  activePresentationId?: string;
  createdAt: string;
  updatedAt: string;
};

export function toArticleDto(article: Article): ArticleDto {
  return {
    id: article.id,
    tenantId: article.tenantId,
    title: article.title,
    slug: article.slug.value,
    markdown: article.markdown,
    status: article.status,
    activePresentationId: article.activePresentationId,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}
