import { articleId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { ArticleNotFoundError } from "../../domain/article.errors";
import type { ArticleRepository } from "../../domain/article.repository";

export type GetPublishedArticleByIdQuery = {
  articleId: string;
};

export class GetPublishedArticleByIdHandler {
  constructor(private readonly repository: ArticleRepository) {}

  async execute(query: GetPublishedArticleByIdQuery): Promise<ArticleDto> {
    const article = await this.repository.findByPublicId(
      articleId(query.articleId),
    );
    if (!article || article.status !== "published") {
      throw new ArticleNotFoundError();
    }
    return toArticleDto(article);
  }
}
