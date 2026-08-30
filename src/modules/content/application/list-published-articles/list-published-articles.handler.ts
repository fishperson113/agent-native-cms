import { toArticleDto, type ArticleDto } from "../article.dto";
import type { ArticleRepository } from "../../domain/article.repository";

export class ListPublishedArticlesHandler {
  constructor(private readonly repository: ArticleRepository) {}

  async execute(): Promise<ArticleDto[]> {
    const articles = await this.repository.listPublished();
    return articles
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map(toArticleDto);
  }
}
