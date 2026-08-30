import { articleId, tenantId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { loadArticle } from "../load-article";
import type { ArticleRepository } from "../../domain/article.repository";

export type GetArticleQuery = {
  tenantId: string;
  articleId: string;
};

export class GetArticleHandler {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(query: GetArticleQuery): Promise<ArticleDto> {
    const article = await loadArticle(
      this.articleRepository,
      tenantId(query.tenantId),
      articleId(query.articleId),
    );
    return toArticleDto(article);
  }
}
