import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import {
  articlePresentations,
  articles,
  tenants,
} from "@/infrastructure/database/schema";
import { Article } from "@/modules/content/domain/article";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { UploadArticlePresentationHandler } from "@/modules/presentation/application/upload-article-presentation/upload-article-presentation.handler";
import { EsbuildPresentationCompiler } from "@/modules/presentation/infrastructure/compiler/esbuild-presentation-compiler";
import { DrizzleArticlePresentationRepository } from "@/modules/presentation/infrastructure/persistence/drizzle-article-presentation.repository";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";
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
const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
const otherOwnerId = tenantId("10000000-0000-4000-8000-000000000002");
const targetArticleId = articleId("20000000-0000-4000-8000-000000000001");

beforeEach(async () => {
  await database.db.delete(articlePresentations);
  await database.db.delete(articles);
  await database.db.delete(tenants);
  const now = new Date("2026-08-27T00:00:00.000Z");
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
  await articleRepository.save(
    Article.create({
      id: targetArticleId,
      tenantId: ownerId,
      title: "Programmable article",
      slug: "programmable-article",
      markdown: "# Kernel stays online",
      now,
    }),
  );
});

afterAll(async () => {
  await database.close();
});

describe("presentation upload core", () => {
  it("compiles and persists multiple uploaded programs without changing the article", async () => {
    const upload = new UploadArticlePresentationHandler(
      articleRepository,
      presentationRepository,
      new EsbuildPresentationCompiler(),
      new UuidGenerator(),
      new SystemClock(),
    );
    const source = `
      import { ArticleRoot, Hero, Markdown } from "@cms/article-sdk";
      export default function Presentation({ article }) {
        return <ArticleRoot><Hero title={article.title} /><Markdown content={article.markdown} /></ArticleRoot>;
      }
    `;

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

    expect(first.presentation.status).toBe("compiled");
    expect(first.presentation.compiledCode).toContain("function mount");
    expect(second.presentation.status).toBe("compiled");
    expect(second.presentation.id).not.toBe(first.presentation.id);
    expect(
      await presentationRepository.listByArticle(ownerId, targetArticleId),
    ).toHaveLength(2);
    expect(
      await presentationRepository.listByArticle(otherOwnerId, targetArticleId),
    ).toEqual([]);

    const article = await articleRepository.findById(ownerId, targetArticleId);
    expect(article?.activePresentationId).toBeUndefined();
  });

  it("persists a failed artifact when uploaded TSX does not compile", async () => {
    const upload = new UploadArticlePresentationHandler(
      articleRepository,
      presentationRepository,
      new EsbuildPresentationCompiler(),
      new UuidGenerator(),
      new SystemClock(),
    );

    const result = await upload.execute({
      tenantId: ownerId,
      articleId: targetArticleId,
      sourceCode: "export default function Broken( {",
    });

    expect(result.presentation.status).toBe("failed");
    expect(result.presentation.compiledCode).toBeUndefined();
    expect(result.compileErrors).not.toEqual([]);
    expect(
      await presentationRepository.findById(
        ownerId,
        articlePresentationId(result.presentation.id),
      ),
    ).not.toBeNull();
  });
});
