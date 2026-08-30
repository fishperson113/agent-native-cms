import type { Database } from "@/infrastructure/database/client";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import type {
  PresentationLifecycleRepositories,
  PresentationLifecycleUnitOfWork,
} from "@/modules/presentation/application/ports/presentation-lifecycle-unit-of-work";

import { DrizzleArticlePresentationRepository } from "./drizzle-article-presentation.repository";

export class DrizzlePresentationLifecycleUnitOfWork
  implements PresentationLifecycleUnitOfWork
{
  constructor(private readonly db: Database) {}

  async execute<T>(
    work: (repositories: PresentationLifecycleRepositories) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (transaction) =>
      work({
        articles: new DrizzleArticleRepository(transaction),
        presentations: new DrizzleArticlePresentationRepository(transaction),
      }),
    );
  }
}
