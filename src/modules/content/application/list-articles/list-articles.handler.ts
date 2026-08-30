import { tenantId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import type { ArticleRepository } from "../../domain/article.repository";

export type ListArticlesQuery = {
  tenantId: string;
};

export class ListArticlesHandler {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(query: ListArticlesQuery): Promise<ArticleDto[]> {
    const articles = await this.articleRepository.listByTenant(
      tenantId(query.tenantId),
    );
    return articles.map(toArticleDto);
  }
}
