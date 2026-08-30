import { articleId, tenantId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { loadArticle } from "../load-article";
import type { ArticleRepository } from "../../domain/article.repository";

export type UnpublishArticleCommand = {
  tenantId: string;
  articleId: string;
};

export class UnpublishArticleHandler {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: UnpublishArticleCommand): Promise<ArticleDto> {
    const ownerId = tenantId(command.tenantId);
    const article = await loadArticle(
      this.articleRepository,
      ownerId,
      articleId(command.articleId),
    );
    article.unpublish(this.clock.now());
    await this.articleRepository.save(article);
    return toArticleDto(article);
  }
}
