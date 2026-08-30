import { articleId, tenantId } from "@/shared/kernel/identifiers";

import { loadArticle } from "../load-article";
import type { ArticleRepository } from "../../domain/article.repository";

export type DeleteArticleCommand = {
  tenantId: string;
  articleId: string;
};

export class DeleteArticleHandler {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async execute(command: DeleteArticleCommand): Promise<void> {
    const ownerId = tenantId(command.tenantId);
    const id = articleId(command.articleId);
    await loadArticle(this.articleRepository, ownerId, id);
    await this.articleRepository.delete(ownerId, id);
  }
}
