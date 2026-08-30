import type { ArticleRepository } from "@/modules/content/domain/article.repository";

import type { ArticlePresentationRepository } from "../../domain/article-presentation.repository";

export type PresentationLifecycleRepositories = {
  articles: ArticleRepository;
  presentations: ArticlePresentationRepository;
};

export interface PresentationLifecycleUnitOfWork {
  execute<T>(
    work: (repositories: PresentationLifecycleRepositories) => Promise<T>,
  ): Promise<T>;
}
