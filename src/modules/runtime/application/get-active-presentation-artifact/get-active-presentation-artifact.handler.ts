import { ArticleNotFoundError } from "@/modules/content/domain/article.errors";
import type { ArticleRepository } from "@/modules/content/domain/article.repository";
import type { ArticlePresentationRepository } from "@/modules/presentation/domain/article-presentation.repository";
import { articleId } from "@/shared/kernel/identifiers";

export type GetActivePresentationArtifactQuery = {
  articleId: string;
};

export type ActivePresentationArtifact = {
  id: string;
  articleId: string;
  compiledCode: string;
  updatedAt: string;
};

export class GetActivePresentationArtifactHandler {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly presentations: ArticlePresentationRepository,
  ) {}

  async execute(
    query: GetActivePresentationArtifactQuery,
  ): Promise<ActivePresentationArtifact | null> {
    const article = await this.articles.findByPublicId(
      articleId(query.articleId),
    );
    if (!article || article.status !== "published") {
      throw new ArticleNotFoundError();
    }
    if (!article.activePresentationId) {
      return null;
    }

    const presentation = await this.presentations.findById(
      article.tenantId,
      article.activePresentationId,
    );
    if (
      !presentation ||
      presentation.articleId !== article.id ||
      presentation.status !== "active" ||
      !presentation.compiledCode
    ) {
      return null;
    }

    return {
      id: presentation.id,
      articleId: presentation.articleId,
      compiledCode: presentation.compiledCode,
      updatedAt: presentation.updatedAt.toISOString(),
    };
  }
}
