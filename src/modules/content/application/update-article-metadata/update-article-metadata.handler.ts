import { articleId, tenantId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";

import { toArticleDto, type ArticleDto } from "../article.dto";
import { loadArticle } from "../load-article";
import { ArticleSlugAlreadyExistsError } from "../../domain/article.errors";
import type { ArticleRepository } from "../../domain/article.repository";
import { ArticleSlug } from "../../domain/article-slug";

export type UpdateArticleMetadataCommand = {
  tenantId: string;
  articleId: string;
  title?: string;
  slug?: string;
};

export class UpdateArticleMetadataHandler {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateArticleMetadataCommand): Promise<ArticleDto> {
    const ownerId = tenantId(command.tenantId);
    const id = articleId(command.articleId);
    const article = await loadArticle(this.articleRepository, ownerId, id);
    const now = this.clock.now();

    if (command.slug !== undefined) {
      const nextSlug = ArticleSlug.create(command.slug);
      if (!article.slug.equals(nextSlug)) {
        const existing = await this.articleRepository.findBySlug(
          ownerId,
          nextSlug,
        );
        if (existing) {
          throw new ArticleSlugAlreadyExistsError(nextSlug.value);
        }
        article.changeSlug(nextSlug.value, now);
      }
    }

    if (command.title !== undefined) {
      article.changeTitle(command.title, now);
    }

    await this.articleRepository.save(article);
    return toArticleDto(article);
  }
}
