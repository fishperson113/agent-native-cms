import { tenantId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import type { ArticleRepository } from "../../domain/article.repository";

export type ListPublishedArticlesQuery = {
  tenantId: string;
};

export class ListPublishedArticlesHandler {
  constructor(private readonly repository: ArticleRepository) {}

  async execute(query: ListPublishedArticlesQuery): Promise<ArticleDto[]> {
    const articles = await this.repository.listByTenant(tenantId(query.tenantId));
    return articles
      .filter((article) => article.status === "published")
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map(toArticleDto);
  }
}
