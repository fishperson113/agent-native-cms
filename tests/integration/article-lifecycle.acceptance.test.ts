import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import {
  articlePresentations,
  articles,
  tenants,
} from "@/infrastructure/database/schema";
import { CreateArticleHandler } from "@/modules/content/application/create-article/create-article.handler";
import { DeleteArticleHandler } from "@/modules/content/application/delete-article/delete-article.handler";
import { GetArticleHandler } from "@/modules/content/application/get-article/get-article.handler";
import { GetArticleBySlugHandler } from "@/modules/content/application/get-article-by-slug/get-article-by-slug.handler";
import { ListArticlesHandler } from "@/modules/content/application/list-articles/list-articles.handler";
import { PublishArticleHandler } from "@/modules/content/application/publish-article/publish-article.handler";
import { UpdateArticleContentHandler } from "@/modules/content/application/update-article-content/update-article-content.handler";
import { UpdateArticleMetadataHandler } from "@/modules/content/application/update-article-metadata/update-article-metadata.handler";
import {
  ArticleNotFoundError,
  ArticleSlugAlreadyExistsError,
} from "@/modules/content/domain/article.errors";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { tenantId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";
import { UuidGenerator } from "@/shared/kernel/ports/id-generator";
import { BasicSlugGenerator } from "@/shared/kernel/ports/slug-generator";

config({ path: ".env", quiet: true });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const tenantRepository = new DrizzleTenantRepository(database.db);
const articleRepository = new DrizzleArticleRepository(database.db);

const tenantAId = tenantId("10000000-0000-4000-8000-000000000001");
const tenantBId = tenantId("10000000-0000-4000-8000-000000000002");

class FixedClock implements Clock {
  now(): Date {
    return new Date("2026-08-27T00:00:00.000Z");
  }
}

const clock = new FixedClock();

async function seedTenants(): Promise<void> {
  await tenantRepository.save(
    Tenant.create({
      id: tenantAId,
      name: "Tenant A",
      slug: "tenant-a",
      now: clock.now(),
    }),
  );
  await tenantRepository.save(
    Tenant.create({
      id: tenantBId,
      name: "Tenant B",
      slug: "tenant-b",
      now: clock.now(),
    }),
  );
}

beforeEach(async () => {
  await database.db.delete(articlePresentations);
  await database.db.delete(articles);
  await database.db.delete(tenants);
  await seedTenants();
});

afterAll(async () => {
  await database.close();
});

describe("terminal article lifecycle acceptance", () => {
  it("runs CRUD and publication while enforcing tenant isolation", async () => {
    const createArticle = new CreateArticleHandler(
      articleRepository,
      tenantRepository,
      new UuidGenerator(),
      new BasicSlugGenerator(),
      clock,
    );
    const updateContent = new UpdateArticleContentHandler(
      articleRepository,
      clock,
    );
    const updateMetadata = new UpdateArticleMetadataHandler(
      articleRepository,
      clock,
    );
    const publishArticle = new PublishArticleHandler(articleRepository, clock);
    const getArticle = new GetArticleHandler(articleRepository);
    const getArticleBySlug = new GetArticleBySlugHandler(articleRepository);
    const listArticles = new ListArticlesHandler(articleRepository);
    const deleteArticle = new DeleteArticleHandler(articleRepository);

    const tenantAArticle = await createArticle.execute({
      tenantId: tenantAId,
      title: "Agent Native CMS",
      markdown: "# Initial draft",
    });
    const tenantBArticle = await createArticle.execute({
      tenantId: tenantBId,
      title: "Agent Native CMS",
      markdown: "# Same slug, different tenant",
    });

    expect(tenantAArticle.slug).toBe("agent-native-cms");
    expect(tenantBArticle.slug).toBe("agent-native-cms");
    expect(await listArticles.execute({ tenantId: tenantAId })).toHaveLength(1);
    expect(await listArticles.execute({ tenantId: tenantBId })).toHaveLength(1);

    await expect(
      createArticle.execute({
        tenantId: tenantAId,
        title: "Duplicate",
        slug: "agent-native-cms",
      }),
    ).rejects.toThrow(ArticleSlugAlreadyExistsError);

    await updateContent.execute({
      tenantId: tenantAId,
      articleId: tenantAArticle.id,
      markdown: "# Updated through an application handler",
    });
    await updateMetadata.execute({
      tenantId: tenantAId,
      articleId: tenantAArticle.id,
      title: "Published Agent-Native CMS",
      slug: "published-agent-native-cms",
    });
    const published = await publishArticle.execute({
      tenantId: tenantAId,
      articleId: tenantAArticle.id,
    });

    expect(published.status).toBe("published");
    expect(published.markdown).toContain("application handler");
    expect(published.slug).toBe("published-agent-native-cms");
    expect(
      await getArticleBySlug.execute({
        tenantId: tenantAId,
        slug: "published-agent-native-cms",
      }),
    ).toEqual(published);

    await expect(
      getArticle.execute({
        tenantId: tenantBId,
        articleId: tenantAArticle.id,
      }),
    ).rejects.toThrow(ArticleNotFoundError);

    await deleteArticle.execute({
      tenantId: tenantAId,
      articleId: tenantAArticle.id,
    });
    await expect(
      getArticle.execute({
        tenantId: tenantAId,
        articleId: tenantAArticle.id,
      }),
    ).rejects.toThrow(ArticleNotFoundError);
    expect(await listArticles.execute({ tenantId: tenantBId })).toHaveLength(1);
  });
});
