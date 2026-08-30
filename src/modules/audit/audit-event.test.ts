import { describe, expect, it } from "vitest";

import { assertSafeAuditMetadata } from "./audit-event";

describe("audit metadata safety", () => {
  it("accepts small allowlisted operational metadata", () => {
    expect(() =>
      assertSafeAuditMetadata({
        toolName: "cms_create_article",
        resultState: "compiled",
        duration: 12,
      }),
    ).not.toThrow();
  });

  it.each([
    [{ authorization: "Bearer hidden" }],
    [{ plaintextKey: "hidden" }],
    [{ markdown: "# private content" }],
    [{ sourceCode: "export default function X() {}" }],
    [{ innocent: "cms_0123456789ab_actual-secret" }],
  ])("rejects secret-bearing metadata", (metadata) => {
    expect(() => assertSafeAuditMetadata(metadata)).toThrow();
  });
});
