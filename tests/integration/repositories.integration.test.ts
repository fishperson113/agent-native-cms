import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import {
  articlePresentations,
  articles,
  tenants,
} from "@/infrastructure/database/schema";
import { ArticleSlugAlreadyExistsError } from "@/modules/content/domain/article.errors";
import { ArticleSlug } from "@/modules/content/domain/article-slug";
import { Article } from "@/modules/content/domain/article";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { TenantSlug } from "@/modules/tenant/domain/tenant-slug";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { articleId, tenantId } from "@/shared/kernel/identifiers";

config({ path: ".env", quiet: true });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const tenantRepository = new DrizzleTenantRepository(database.db);
const articleRepository = new DrizzleArticleRepository(database.db);
const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
const otherOwnerId = tenantId("10000000-0000-4000-8000-000000000002");
const now = new Date("2026-08-27T00:00:00.000Z");

beforeEach(async () => {
  await database.db.delete(articlePresentations);
  await database.db.delete(articles);
  await database.db.delete(tenants);
  await tenantRepository.save(
    Tenant.create({ id: ownerId, name: "Owner", slug: "owner", now }),
  );
  await tenantRepository.save(
    Tenant.create({
      id: otherOwnerId,
      name: "Other",
      slug: "other",
      now,
    }),
  );
});

afterAll(async () => {
  await database.close();
});

describe("Drizzle repositories", () => {
  it("round-trips tenants by ID and slug", async () => {
    const byId = await tenantRepository.findById(ownerId);
    const bySlug = await tenantRepository.findBySlug(TenantSlug.create("owner"));

    expect(byId?.toSnapshot()).toEqual(bySlug?.toSnapshot());
    expect(byId?.name).toBe("Owner");
  });

  it("round-trips an article and hides it from another tenant", async () => {
    const id = articleId("20000000-0000-4000-8000-000000000001");
    const article = Article.create({
      id,
      tenantId: ownerId,
      title: "Article",
      slug: "article",
      markdown: "# Article",
      now,
    });
    await articleRepository.save(article);

    expect((await articleRepository.findById(ownerId, id))?.toSnapshot()).toEqual(
      article.toSnapshot(),
    );
    expect(await articleRepository.findById(otherOwnerId, id)).toBeNull();
    expect(
      await articleRepository.findBySlug(
        otherOwnerId,
        ArticleSlug.create("article"),
      ),
    ).toBeNull();
  });

  it("enforces slug uniqueness within a tenant at the database boundary", async () => {
    await articleRepository.save(
      Article.create({
        id: articleId("20000000-0000-4000-8000-000000000001"),
        tenantId: ownerId,
        title: "First",
        slug: "same-slug",
        now,
      }),
    );

    await expect(
      articleRepository.save(
        Article.create({
          id: articleId("20000000-0000-4000-8000-000000000002"),
          tenantId: ownerId,
          title: "Second",
          slug: "same-slug",
          now,
        }),
      ),
    ).rejects.toThrow(ArticleSlugAlreadyExistsError);
  });
});
