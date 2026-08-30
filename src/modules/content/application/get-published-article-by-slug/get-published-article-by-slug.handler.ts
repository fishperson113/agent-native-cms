import { tenantId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { ArticleNotFoundError } from "../../domain/article.errors";
import type { ArticleRepository } from "../../domain/article.repository";
import { ArticleSlug } from "../../domain/article-slug";

export type GetPublishedArticleBySlugQuery = {
  tenantId: string;
  slug: string;
};

export class GetPublishedArticleBySlugHandler {
  constructor(private readonly repository: ArticleRepository) {}

  async execute(query: GetPublishedArticleBySlugQuery): Promise<ArticleDto> {
    const article = await this.repository.findBySlug(
      tenantId(query.tenantId),
      ArticleSlug.create(query.slug),
    );
    if (!article || article.status !== "published") {
      throw new ArticleNotFoundError();
    }
    return toArticleDto(article);
  }
}
