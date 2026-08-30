import { describe, expect, it } from "vitest";

import type { TenantRepository } from "@/modules/tenant/domain/tenant.repository";
import { TenantSlug } from "@/modules/tenant/domain/tenant-slug";
import { Tenant } from "@/modules/tenant/domain/tenant";
import type { Clock } from "@/shared/kernel/ports/clock";
import type { IdGenerator } from "@/shared/kernel/ports/id-generator";
import { BasicSlugGenerator } from "@/shared/kernel/ports/slug-generator";
import type { ArticleId, TenantId } from "@/shared/kernel/identifiers";
import { tenantId } from "@/shared/kernel/identifiers";

import { ArticleNotFoundError } from "../domain/article.errors";
import type { ArticleRepository } from "../domain/article.repository";
import type { ArticleSlug } from "../domain/article-slug";
import type { Article } from "../domain/article";
import { CreateArticleHandler } from "./create-article/create-article.handler";
import { DeleteArticleHandler } from "./delete-article/delete-article.handler";
import { GetArticleHandler } from "./get-article/get-article.handler";
import { ListArticlesHandler } from "./list-articles/list-articles.handler";
import { PublishArticleHandler } from "./publish-article/publish-article.handler";
import { UnpublishArticleHandler } from "./unpublish-article/unpublish-article.handler";
import { UpdateArticleContentHandler } from "./update-article-content/update-article-content.handler";
import { UpdateArticleMetadataHandler } from "./update-article-metadata/update-article-metadata.handler";

const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
const otherTenantId = tenantId("10000000-0000-4000-8000-000000000002");

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}
  now(): Date {
    return this.value;
  }
}

class FixedIdGenerator implements IdGenerator {
  generate(): string {
    return "20000000-0000-4000-8000-000000000001";
  }
}

class InMemoryTenantRepository implements TenantRepository {
  private readonly tenants = new Map<TenantId, Tenant>();

  async findById(id: TenantId): Promise<Tenant | null> {
    return this.tenants.get(id) ?? null;
  }

  async findBySlug(slug: TenantSlug): Promise<Tenant | null> {
    return (
      [...this.tenants.values()].find(
        (tenant) => tenant.slug.value === slug.value,
      ) ?? null
    );
  }

  async list(): Promise<Tenant[]> {
    return [...this.tenants.values()];
  }

  async save(tenant: Tenant): Promise<void> {
    this.tenants.set(tenant.id, tenant);
  }
}

class InMemoryArticleRepository implements ArticleRepository {
  private readonly articles = new Map<ArticleId, Article>();

  async save(article: Article): Promise<void> {
    this.articles.set(article.id, article);
  }

  async findById(
    tenant: TenantId,
    id: ArticleId,
  ): Promise<Article | null> {
    const article = this.articles.get(id);
    return article?.tenantId === tenant ? article : null;
  }

  async findByPublicId(id: ArticleId): Promise<Article | null> {
    return this.articles.get(id) ?? null;
  }

  async findBySlug(
    tenant: TenantId,
    slug: ArticleSlug,
  ): Promise<Article | null> {
    return (
      [...this.articles.values()].find(
        (article) =>
          article.tenantId === tenant && article.slug.value === slug.value,
      ) ?? null
    );
  }

  async listByTenant(tenant: TenantId): Promise<Article[]> {
    return [...this.articles.values()].filter(
      (article) => article.tenantId === tenant,
    );
  }

  async listPublished(): Promise<Article[]> {
    return [...this.articles.values()].filter(
      (article) => article.status === "published",
    );
  }

  async delete(tenant: TenantId, id: ArticleId): Promise<void> {
    const article = await this.findById(tenant, id);
    if (article) {
      this.articles.delete(id);
    }
  }
}

describe("Article application lifecycle", () => {
  it("runs CRUD and publication workflows with explicit tenant scope", async () => {
    const now = new Date("2026-08-27T00:00:00.000Z");
    const clock = new FixedClock(now);
    const tenants = new InMemoryTenantRepository();
    await tenants.save(
      Tenant.create({ id: ownerId, name: "Acme", slug: "acme", now }),
    );
    const articles = new InMemoryArticleRepository();

    const created = await new CreateArticleHandler(
      articles,
      tenants,
      new FixedIdGenerator(),
      new BasicSlugGenerator(),
      clock,
    ).execute({
      tenantId: ownerId,
      title: "Agent Native CMS",
      markdown: "# Draft",
    });

    expect(created.slug).toBe("agent-native-cms");
    expect(created.status).toBe("draft");

    await new UpdateArticleContentHandler(articles, clock).execute({
      tenantId: ownerId,
      articleId: created.id,
      markdown: "# Updated",
    });
    await new UpdateArticleMetadataHandler(articles, clock).execute({
      tenantId: ownerId,
      articleId: created.id,
      title: "Updated title",
      slug: "updated-title",
    });
    const published = await new PublishArticleHandler(articles, clock).execute({
      tenantId: ownerId,
      articleId: created.id,
    });

    expect(published.status).toBe("published");
    expect(published.markdown).toBe("# Updated");
    expect(published.slug).toBe("updated-title");
    expect(await new ListArticlesHandler(articles).execute({ tenantId: ownerId })).toHaveLength(1);
    expect(
      await new ListArticlesHandler(articles).execute({
        tenantId: otherTenantId,
      }),
    ).toEqual([]);

    await expect(
      new GetArticleHandler(articles).execute({
        tenantId: otherTenantId,
        articleId: created.id,
      }),
    ).rejects.toThrow(ArticleNotFoundError);

    const draft = await new UnpublishArticleHandler(articles, clock).execute({
      tenantId: ownerId,
      articleId: created.id,
    });
    expect(draft.status).toBe("draft");

    await new DeleteArticleHandler(articles).execute({
      tenantId: ownerId,
      articleId: created.id,
    });
    await expect(
      new GetArticleHandler(articles).execute({
        tenantId: ownerId,
        articleId: created.id,
      }),
    ).rejects.toThrow(ArticleNotFoundError);
  });
});
