import type { ArticlePresentationId, TenantId } from "@/shared/kernel/identifiers";

import { PresentationNotFoundError } from "../domain/article-presentation.errors";
import type { ArticlePresentationRepository } from "../domain/article-presentation.repository";
import type { ArticlePresentation } from "../domain/article-presentation";

export async function loadArticlePresentation(
  repository: ArticlePresentationRepository,
  ownerId: TenantId,
  presentationId: ArticlePresentationId,
): Promise<ArticlePresentation> {
  const presentation = await repository.findById(ownerId, presentationId);
  if (!presentation) {
    throw new PresentationNotFoundError();
  }
  return presentation;
}
