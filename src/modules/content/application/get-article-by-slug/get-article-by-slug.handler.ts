import { tenantId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { ArticleNotFoundError } from "../../domain/article.errors";
import type { ArticleRepository } from "../../domain/article.repository";
import { ArticleSlug } from "../../domain/article-slug";

export type GetArticleBySlugQuery = {
  tenantId: string;
  slug: string;
};

export class GetArticleBySlugHandler {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(query: GetArticleBySlugQuery): Promise<ArticleDto> {
    const article = await this.articleRepository.findBySlug(
      tenantId(query.tenantId),
      ArticleSlug.create(query.slug),
    );
    if (!article) {
      throw new ArticleNotFoundError();
    }
    return toArticleDto(article);
  }
}
