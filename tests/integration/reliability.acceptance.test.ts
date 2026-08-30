import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import {
  articlePresentations,
  articles,
  tenants,
} from "@/infrastructure/database/schema";
import { DeleteArticleHandler } from "@/modules/content/application/delete-article/delete-article.handler";
import type { ArticleRepository } from "@/modules/content/domain/article.repository";
import type { ArticleSlug } from "@/modules/content/domain/article-slug";
import { Article } from "@/modules/content/domain/article";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { ActivateArticlePresentationHandler } from "@/modules/presentation/application/activate-article-presentation/activate-article-presentation.handler";
import type {
  PresentationLifecycleRepositories,
  PresentationLifecycleUnitOfWork,
} from "@/modules/presentation/application/ports/presentation-lifecycle-unit-of-work";
import { ResetArticlePresentationHandler } from "@/modules/presentation/application/reset-article-presentation/reset-article-presentation.handler";
import { UploadArticlePresentationHandler } from "@/modules/presentation/application/upload-article-presentation/upload-article-presentation.handler";
import { EsbuildPresentationCompiler } from "@/modules/presentation/infrastructure/compiler/esbuild-presentation-compiler";
import { DrizzleArticlePresentationRepository } from "@/modules/presentation/infrastructure/persistence/drizzle-article-presentation.repository";
import { DrizzlePresentationLifecycleUnitOfWork } from "@/modules/presentation/infrastructure/persistence/drizzle-presentation-lifecycle-unit-of-work";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import type { ArticleId, TenantId } from "@/shared/kernel/identifiers";
import { articleId, tenantId } from "@/shared/kernel/identifiers";
import { SystemClock } from "@/shared/kernel/ports/clock";
import { UuidGenerator } from "@/shared/kernel/ports/id-generator";

config({ path: ".env", quiet: true });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const tenantRepository = new DrizzleTenantRepository(database.db);
const articleRepository = new DrizzleArticleRepository(database.db);
const presentationRepository = new DrizzleArticlePresentationRepository(
  database.db,
);
const lifecycle = new DrizzlePresentationLifecycleUnitOfWork(database.db);
const clock = new SystemClock();
const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
const targetArticleId = articleId("20000000-0000-4000-8000-000000000001");
const source = `
  import { ArticleRoot, Hero, Markdown } from "@cms/article-sdk";
  export default function Presentation({ article }) {
    return <ArticleRoot><Hero title={article.title} /><Markdown content={article.markdown} /></ArticleRoot>;
  }
`;

class FailingSaveArticleRepository implements ArticleRepository {
  constructor(private readonly delegate: ArticleRepository) {}

  async save(): Promise<void> {
    throw new Error("Injected article save failure.");
  }

  findById(owner: TenantId, id: ArticleId) {
    return this.delegate.findById(owner, id);
  }

  findByPublicId(id: ArticleId) {
    return this.delegate.findByPublicId(id);
  }

  findBySlug(owner: TenantId, slug: ArticleSlug) {
    return this.delegate.findBySlug(owner, slug);
  }

  listByTenant(owner: TenantId) {
    return this.delegate.listByTenant(owner);
  }

  listPublished() {
    return this.delegate.listPublished();
  }

  delete(owner: TenantId, id: ArticleId) {
    return this.delegate.delete(owner, id);
  }
}

class FailingArticleSaveUnitOfWork
  implements PresentationLifecycleUnitOfWork
{
  async execute<T>(
    work: (repositories: PresentationLifecycleRepositories) => Promise<T>,
  ): Promise<T> {
    return database.db.transaction(async (transaction) => {
      const transactionalArticles = new DrizzleArticleRepository(transaction);
      return work({
        articles: new FailingSaveArticleRepository(transactionalArticles),
        presentations: new DrizzleArticlePresentationRepository(transaction),
      });
    });
  }
}

function uploadHandler() {
  return new UploadArticlePresentationHandler(
    articleRepository,
    presentationRepository,
    new EsbuildPresentationCompiler(),
    new UuidGenerator(),
    clock,
  );
}

beforeEach(async () => {
  await database.db.delete(articlePresentations);
  await database.db.delete(articles);
  await database.db.delete(tenants);
  const now = clock.now();
  await tenantRepository.save(
    Tenant.create({ id: ownerId, name: "Reliability", slug: "reliability", now }),
  );
  await articleRepository.save(
    Article.create({
      id: targetArticleId,
      tenantId: ownerId,
      title: "Long-running kernel",
      slug: "long-running-kernel",
      markdown: "# Stable",
      now,
    }),
  );
});

afterAll(async () => {
  await database.close();
});

describe("hosted-kernel reliability", () => {
  it("rolls back every activation/reset mutation when the article pointer cannot be saved", async () => {
    const upload = uploadHandler();
    const first = await upload.execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      sourceCode: source,
    });
    const second = await upload.execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      sourceCode: source
        .replace("Markdown", "Card")
        .replace(
          "<Markdown content={article.markdown} />",
          "<Card>{article.markdown}</Card>",
        ),
    });
    await new ActivateArticlePresentationHandler(lifecycle, clock).execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      presentationId: first.presentation.id,
    });

    const failingActivation = new ActivateArticlePresentationHandler(
      new FailingArticleSaveUnitOfWork(),
      clock,
    );
    await expect(
      failingActivation.execute({
        tenantId: ownerId,
        articleId: targetArticleId,
        presentationId: second.presentation.id,
      }),
    ).rejects.toThrow("Injected article save failure.");

    let stored = await presentationRepository.listByArticle(
      ownerId,
      targetArticleId,
    );
    expect(stored.find((item) => item.id === first.presentation.id)?.status).toBe(
      "active",
    );
    expect(stored.find((item) => item.id === second.presentation.id)?.status).toBe(
      "compiled",
    );
    expect(
      (await articleRepository.findById(ownerId, targetArticleId))
        ?.activePresentationId,
    ).toBe(first.presentation.id);

    await expect(
      new ResetArticlePresentationHandler(
        new FailingArticleSaveUnitOfWork(),
        clock,
      ).execute({ tenantId: ownerId, articleId: targetArticleId }),
    ).rejects.toThrow("Injected article save failure.");

    stored = await presentationRepository.listByArticle(
      ownerId,
      targetArticleId,
    );
    expect(stored.find((item) => item.id === first.presentation.id)?.status).toBe(
      "active",
    );
    expect(
      (await articleRepository.findById(ownerId, targetArticleId))
        ?.activePresentationId,
    ).toBe(first.presentation.id);
  });

  it("isolates failed and repeated uploads from the active artifact", async () => {
    const upload = uploadHandler();
    const successful = [];
    for (let version = 1; version <= 4; version += 1) {
      successful.push(
        await upload.execute({
          tenantId: ownerId,
          articleId: targetArticleId,
          sourceCode: `${source}\n// version ${version}`,
        }),
      );
    }
    await new ActivateArticlePresentationHandler(lifecycle, clock).execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      presentationId: successful[0].presentation.id,
    });
    const failed = await upload.execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      sourceCode: "export default function Broken( {",
    });

    expect(new Set(successful.map((item) => item.presentation.id)).size).toBe(4);
    expect(failed.presentation.status).toBe("failed");
    expect(
      (await articleRepository.findById(ownerId, targetArticleId))
        ?.activePresentationId,
    ).toBe(successful[0].presentation.id);
    expect(
      await presentationRepository.findActiveByArticle(
        ownerId,
        targetArticleId,
      ),
    ).toMatchObject({ id: successful[0].presentation.id, status: "active" });
  });

  it("deletes owned presentation artifacts when their article is deleted", async () => {
    await uploadHandler().execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      sourceCode: source,
    });
    await new DeleteArticleHandler(articleRepository).execute({
      tenantId: ownerId,
      articleId: targetArticleId,
    });

    expect(
      await presentationRepository.listByArticle(ownerId, targetArticleId),
    ).toEqual([]);
    expect(
      await articleRepository.findById(ownerId, targetArticleId),
    ).toBeNull();
  });
});
