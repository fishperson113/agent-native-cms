import type { ArticlePresentation } from "../domain/article-presentation";

export type ArticlePresentationDto = {
  id: string;
  tenantId: string;
  articleId: string;
  sourceCode: string;
  compiledCode?: string;
  status: "draft" | "compiled" | "failed" | "active";
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

export function toArticlePresentationDto(
  presentation: ArticlePresentation,
): ArticlePresentationDto {
  return {
    id: presentation.id,
    tenantId: presentation.tenantId,
    articleId: presentation.articleId,
    sourceCode: presentation.sourceCode,
    compiledCode: presentation.compiledCode,
    status: presentation.status,
    failureReason: presentation.failureReason,
    createdAt: presentation.createdAt.toISOString(),
    updatedAt: presentation.updatedAt.toISOString(),
  };
}
