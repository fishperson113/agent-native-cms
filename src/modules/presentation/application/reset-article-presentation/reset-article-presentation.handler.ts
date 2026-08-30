import { loadArticle } from "@/modules/content/application/load-article";
import type { ArticleDto } from "@/modules/content/application/article.dto";
import { toArticleDto } from "@/modules/content/application/article.dto";
import { articleId, tenantId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";

import type { PresentationLifecycleUnitOfWork } from "../ports/presentation-lifecycle-unit-of-work";

export type ResetArticlePresentationCommand = {
  tenantId: string;
  articleId: string;
};

export class ResetArticlePresentationHandler {
  constructor(
    private readonly unitOfWork: PresentationLifecycleUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: ResetArticlePresentationCommand): Promise<ArticleDto> {
    const ownerId = tenantId(command.tenantId);
    const targetArticleId = articleId(command.articleId);

    return this.unitOfWork.execute(async ({ articles, presentations }) => {
      const article = await loadArticle(articles, ownerId, targetArticleId);
      if (!article.activePresentationId) {
        return toArticleDto(article);
      }

      const now = this.clock.now();
      const current = await presentations.findActiveByArticle(
        ownerId,
        targetArticleId,
      );
      if (current) {
        current.deactivate(now);
        await presentations.save(current);
      }
      article.detachPresentation(now);
      await articles.save(article);
      return toArticleDto(article);
    });
  }
}
