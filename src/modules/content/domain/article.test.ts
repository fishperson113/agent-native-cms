import { describe, expect, it } from "vitest";

import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";

import {
  ArticleTitleRequiredError,
  InvalidArticleSlugError,
} from "./article.errors";
import { Article } from "./article";

const id = articleId("20000000-0000-4000-8000-000000000001");
const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
const now = new Date("2026-08-27T00:00:00.000Z");

function createArticle(title = "Article"): Article {
  return Article.create({
    id,
    tenantId: ownerId,
    title,
    slug: "article",
    markdown: "# Article",
    now,
  });
}

describe("Article", () => {
  it("creates a tenant-owned draft", () => {
    const article = createArticle();

    expect(article.tenantId).toBe(ownerId);
    expect(article.status).toBe("draft");
    expect(article.markdown).toBe("# Article");
  });

  it("allows empty draft content but requires a title to publish", () => {
    const article = createArticle("");

    expect(article.title).toBe("");
    expect(() => article.publish(now)).toThrow(ArticleTitleRequiredError);
  });

  it("prevents removing the title from a published article", () => {
    const article = createArticle();
    article.publish(now);

    expect(() => article.changeTitle("", now)).toThrow(
      ArticleTitleRequiredError,
    );
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      Article.create({
        id,
        tenantId: ownerId,
        title: "Article",
        slug: "Invalid slug",
        now,
      }),
    ).toThrow(InvalidArticleSlugError);
  });

  it("publishes, unpublishes, and updates content", () => {
    const article = createArticle();
    const later = new Date("2026-08-28T00:00:00.000Z");

    article.changeMarkdown("Updated", later);
    article.publish(later);
    expect(article.markdown).toBe("Updated");
    expect(article.status).toBe("published");

    article.unpublish(later);
    expect(article.status).toBe("draft");
  });

  it("attaches and detaches a presentation", () => {
    const article = createArticle();
    const presentationId = articlePresentationId(
      "30000000-0000-4000-8000-000000000001",
    );

    article.attachPresentation(presentationId, now);
    expect(article.activePresentationId).toBe(presentationId);

    article.detachPresentation(now);
    expect(article.activePresentationId).toBeUndefined();
  });
});
