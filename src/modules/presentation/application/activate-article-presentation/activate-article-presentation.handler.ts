import { loadArticle } from "@/modules/content/application/load-article";
import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";

import {
  toArticlePresentationDto,
  type ArticlePresentationDto,
} from "../article-presentation.dto";
import { loadArticlePresentation } from "../load-article-presentation";
import type { PresentationLifecycleUnitOfWork } from "../ports/presentation-lifecycle-unit-of-work";
import { PresentationArticleMismatchError } from "../../domain/article-presentation.errors";

export type ActivateArticlePresentationCommand = {
  tenantId: string;
  articleId: string;
  presentationId: string;
};

export class ActivateArticlePresentationHandler {
  constructor(
    private readonly unitOfWork: PresentationLifecycleUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: ActivateArticlePresentationCommand,
  ): Promise<ArticlePresentationDto> {
    const ownerId = tenantId(command.tenantId);
    const targetArticleId = articleId(command.articleId);
    const targetPresentationId = articlePresentationId(command.presentationId);

    return this.unitOfWork.execute(async ({ articles, presentations }) => {
      const article = await loadArticle(articles, ownerId, targetArticleId);
      const target = await loadArticlePresentation(
        presentations,
        ownerId,
        targetPresentationId,
      );
      if (target.articleId !== targetArticleId) {
        throw new PresentationArticleMismatchError();
      }

      if (article.activePresentationId === target.id && target.status === "active") {
        return toArticlePresentationDto(target);
      }

      const now = this.clock.now();
      const current = await presentations.findActiveByArticle(
        ownerId,
        targetArticleId,
      );
      if (current && current.id !== target.id) {
        current.deactivate(now);
        await presentations.save(current);
      }

      target.activate(now);
      article.attachPresentation(target.id, now);
      await presentations.save(target);
      await articles.save(article);
      return toArticlePresentationDto(target);
    });
  }
}
