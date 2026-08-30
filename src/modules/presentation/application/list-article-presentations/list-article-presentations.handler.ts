import { loadArticle } from "@/modules/content/application/load-article";
import type { ArticleRepository } from "@/modules/content/domain/article.repository";
import { articleId, tenantId } from "@/shared/kernel/identifiers";

import {
  toArticlePresentationDto,
  type ArticlePresentationDto,
} from "../article-presentation.dto";
import type { ArticlePresentationRepository } from "../../domain/article-presentation.repository";

export type ListArticlePresentationsQuery = {
  tenantId: string;
  articleId: string;
};

export class ListArticlePresentationsHandler {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly presentationRepository: ArticlePresentationRepository,
  ) {}

  async execute(
    query: ListArticlePresentationsQuery,
  ): Promise<ArticlePresentationDto[]> {
    const ownerId = tenantId(query.tenantId);
    const targetArticleId = articleId(query.articleId);
    await loadArticle(this.articleRepository, ownerId, targetArticleId);
    const presentations = await this.presentationRepository.listByArticle(
      ownerId,
      targetArticleId,
    );
    return presentations.map(toArticlePresentationDto);
  }
}
