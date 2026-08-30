import { afterEach, describe, expect, it } from "vitest";

import { assertSameOrigin } from "./admin-http";

const originalAllowedOrigins = process.env.CMS_ADMIN_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalAllowedOrigins === undefined) {
    delete process.env.CMS_ADMIN_ALLOWED_ORIGINS;
  } else {
    process.env.CMS_ADMIN_ALLOWED_ORIGINS = originalAllowedOrigins;
  }
});

describe("assertSameOrigin", () => {
  it("accepts requests without an Origin header", () => {
    expect(assertSameOrigin(new Request("http://localhost:3000/api/admin/session"))).toBe(
      true,
    );
  });

  it("uses the request URL for local same-origin requests by default", () => {
    delete process.env.CMS_ADMIN_ALLOWED_ORIGINS;

    expect(
      assertSameOrigin(
        new Request("http://localhost:3000/api/admin/session", {
          headers: { Origin: "http://localhost:3000" },
        }),
      ),
    ).toBe(true);
  });

  it("accepts an explicitly configured public origin behind a reverse proxy", () => {
    process.env.CMS_ADMIN_ALLOWED_ORIGINS =
      "https://agent-native-cms.onrender.com";

    expect(
      assertSameOrigin(
        new Request("http://localhost:10000/api/admin/session", {
          headers: { Origin: "https://agent-native-cms.onrender.com" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects origins outside the configured allowlist", () => {
    process.env.CMS_ADMIN_ALLOWED_ORIGINS =
      "https://agent-native-cms.onrender.com";

    expect(
      assertSameOrigin(
        new Request("http://localhost:10000/api/admin/session", {
          headers: { Origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });
});
