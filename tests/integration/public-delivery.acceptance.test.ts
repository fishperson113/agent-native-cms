import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { GET as getArtifact } from "@/app/api/articles/[slug]/presentation/route";
import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import { articlePresentations, articles, tenants } from "@/infrastructure/database/schema";
import { getPublicArticle, listPublicArticles } from "@/infrastructure/delivery/public-cms";

config({ path: ".env", quiet: true });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const tenant = "10000000-0000-4000-8000-000000000001";
const publishedId = "20000000-0000-4000-8000-000000000061";
const draftId = "20000000-0000-4000-8000-000000000062";
const presentationId = "30000000-0000-4000-8000-000000000061";
const compiledCode = "export function mount(node){node.textContent='M6 dynamic presentation'}";

beforeEach(async () => {
  await database.db.delete(articlePresentations);
  await database.db.delete(articles);
  await database.db.delete(tenants);
  await database.db.insert(tenants).values({ id: tenant, name: "M6 Tenant", slug: "m6-tenant" });
  await database.db.insert(articles).values([
    { id: publishedId, tenantId: tenant, title: "Published M6 story", slug: "published-m6-story", markdown: "# Public", status: "published" },
    { id: draftId, tenantId: tenant, title: "Private draft", slug: "private-draft", markdown: "# Draft", status: "draft" },
  ]);
  await database.db.insert(articlePresentations).values({
    id: presentationId,
    tenantId: tenant,
    articleId: publishedId,
    sourceCode: "export default function Presentation() {}",
    compiledCode,
    status: "active",
  });
  await database.db
    .update(articles)
    .set({ activePresentationId: presentationId })
    .where(eq(articles.id, publishedId));
});

afterAll(async () => { await database.close(); });

describe("public delivery", () => {
  it("lists only published articles for the configured tenant", async () => {
    const result = await listPublicArticles();
    expect(result.map((article) => article.slug)).toEqual(["published-m6-story"]);
    await expect(getPublicArticle("private-draft")).rejects.toThrow();
  });

  it("serves the active compiled artifact as versioned JavaScript", async () => {
    const response = await getArtifact(
      new Request(`http://localhost/api/articles/published-m6-story/presentation?version=${presentationId}`),
      { params: Promise.resolve({ slug: "published-m6-story" }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/javascript");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("x-presentation-id")).toBe(presentationId);
    expect(await response.text()).toBe(compiledCode);
  });
});
