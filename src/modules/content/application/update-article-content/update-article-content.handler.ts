import { articleId, tenantId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { loadArticle } from "../load-article";
import type { ArticleRepository } from "../../domain/article.repository";

export type UpdateArticleContentCommand = {
  tenantId: string;
  articleId: string;
  markdown: string;
};

export class UpdateArticleContentHandler {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateArticleContentCommand): Promise<ArticleDto> {
    const ownerId = tenantId(command.tenantId);
    const id = articleId(command.articleId);
    const article = await loadArticle(this.articleRepository, ownerId, id);
    article.changeMarkdown(command.markdown, this.clock.now());
    await this.articleRepository.save(article);
    return toArticleDto(article);
  }
}
