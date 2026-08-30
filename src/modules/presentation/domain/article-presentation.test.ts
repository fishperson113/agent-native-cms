import { describe, expect, it } from "vitest";

import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";

import {
  CompiledPresentationRequiredError,
  PresentationFailureReasonRequiredError,
  PresentationNotCompiledError,
  PresentationSourceRequiredError,
} from "./article-presentation.errors";
import { ArticlePresentation } from "./article-presentation";

const id = articlePresentationId("30000000-0000-4000-8000-000000000001");
const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
const targetArticleId = articleId("20000000-0000-4000-8000-000000000001");
const now = new Date("2026-08-27T00:00:00.000Z");

function createPresentation(): ArticlePresentation {
  return ArticlePresentation.create({
    id,
    tenantId: ownerId,
    articleId: targetArticleId,
    sourceCode: "export default function Presentation() { return null; }",
    now,
  });
}

describe("ArticlePresentation", () => {
  it("creates a draft owned by one tenant and article", () => {
    const presentation = createPresentation();

    expect(presentation.status).toBe("draft");
    expect(presentation.tenantId).toBe(ownerId);
    expect(presentation.articleId).toBe(targetArticleId);
  });

  it("requires non-empty source", () => {
    expect(() =>
      ArticlePresentation.create({
        id,
        tenantId: ownerId,
        articleId: targetArticleId,
        sourceCode: "  ",
        now,
      }),
    ).toThrow(PresentationSourceRequiredError);
  });

  it("marks a compiled artifact and activates it", () => {
    const presentation = createPresentation();
    presentation.markCompiled("export function mount() {}", now);
    expect(presentation.status).toBe("compiled");

    presentation.activate(now);
    expect(presentation.status).toBe("active");

    presentation.deactivate(now);
    expect(presentation.status).toBe("compiled");
  });

  it("requires compiled code before activation", () => {
    const presentation = createPresentation();
    expect(() => presentation.activate(now)).toThrow(
      PresentationNotCompiledError,
    );
    expect(() => presentation.markCompiled("", now)).toThrow(
      CompiledPresentationRequiredError,
    );
  });

  it("records a compilation failure", () => {
    const presentation = createPresentation();
    presentation.markFailed("Unexpected token", now);

    expect(presentation.status).toBe("failed");
    expect(presentation.failureReason).toBe("Unexpected token");
    expect(presentation.compiledCode).toBeUndefined();
    expect(() => presentation.markFailed("", now)).toThrow(
      PresentationFailureReasonRequiredError,
    );
  });
});
