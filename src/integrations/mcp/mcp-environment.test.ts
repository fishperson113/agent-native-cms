import { describe, expect, it } from "vitest";

import { parseMcpEnvironment } from "./mcp-environment";

describe("parseMcpEnvironment", () => {
  it("accepts delivery tenant context with optional stdio credential", () => {
    expect(
      parseMcpEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/cms",
        CMS_TENANT_ID: "10000000-0000-4000-8000-000000000001",
        CMS_MCP_STDIO_API_KEY: "cms_tenant_a-long-enough-key",
      }),
    ).toEqual({
      DATABASE_URL: "postgresql://user:password@localhost:5432/cms",
      CMS_TENANT_ID: "10000000-0000-4000-8000-000000000001",
      CMS_MCP_STDIO_API_KEY: "cms_tenant_a-long-enough-key",
    });
  });

  it("rejects an invalid tenant ID", () => {
    expect(() =>
      parseMcpEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/cms",
        CMS_TENANT_ID: "not-a-uuid",
        CMS_MCP_STDIO_API_KEY: "cms_tenant_a-long-enough-key",
      }),
    ).toThrow();
  });
});
