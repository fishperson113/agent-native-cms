import { articlePresentationId, tenantId } from "@/shared/kernel/identifiers";

import {
  toArticlePresentationDto,
  type ArticlePresentationDto,
} from "../article-presentation.dto";
import { loadArticlePresentation } from "../load-article-presentation";
import type { ArticlePresentationRepository } from "../../domain/article-presentation.repository";

export type GetArticlePresentationQuery = {
  tenantId: string;
  presentationId: string;
};

export class GetArticlePresentationHandler {
  constructor(private readonly repository: ArticlePresentationRepository) {}

  async execute(
    query: GetArticlePresentationQuery,
  ): Promise<ArticlePresentationDto> {
    const presentation = await loadArticlePresentation(
      this.repository,
      tenantId(query.tenantId),
      articlePresentationId(query.presentationId),
    );
    return toArticlePresentationDto(presentation);
  }
}
