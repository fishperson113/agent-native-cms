import type { TenantRepository } from "@/modules/tenant/domain/tenant.repository";
import type { Clock } from "@/shared/kernel/ports/clock";
import type { IdGenerator } from "@/shared/kernel/ports/id-generator";
import type { SlugGenerator } from "@/shared/kernel/ports/slug-generator";
import { articleId, tenantId } from "@/shared/kernel/identifiers";

import { toArticleDto, type ArticleDto } from "../article.dto";
import {
  ArticleSlugAlreadyExistsError,
  TenantNotFoundError,
} from "../../domain/article.errors";
import type { ArticleRepository } from "../../domain/article.repository";
import { ArticleSlug } from "../../domain/article-slug";
import { Article } from "../../domain/article";

export type CreateArticleCommand = {
  tenantId: string;
  title: string;
  slug?: string;
  markdown?: string;
};

export class CreateArticleHandler {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly idGenerator: IdGenerator,
    private readonly slugGenerator: SlugGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateArticleCommand): Promise<ArticleDto> {
    const ownerId = tenantId(command.tenantId);
    const tenant = await this.tenantRepository.findById(ownerId);
    if (!tenant) {
      throw new TenantNotFoundError();
    }
    tenant.assertCanCreateContent();

    const slug = ArticleSlug.create(
      command.slug ?? this.slugGenerator.generate(command.title),
    );
    const existing = await this.articleRepository.findBySlug(ownerId, slug);
    if (existing) {
      throw new ArticleSlugAlreadyExistsError(slug.value);
    }

    const article = Article.create({
      id: articleId(this.idGenerator.generate()),
      tenantId: ownerId,
      title: command.title,
      slug: slug.value,
      markdown: command.markdown,
      now: this.clock.now(),
    });
    await this.articleRepository.save(article);

    return toArticleDto(article);
  }
}
