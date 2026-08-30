import { describe, expect, it } from "vitest";

import { parseHttpMcpEnvironment } from "./http-environment";

const valid = {
  DATABASE_URL: "postgresql://cms:cms@localhost:5432/cms",
};

describe("HTTP MCP environment", () => {
  it("accepts database-backed credential authentication", () => {
    expect(parseHttpMcpEnvironment(valid)).toEqual({
      ...valid,
      CMS_MCP_SESSION_IDLE_TIMEOUT_MS: 1_800_000,
      CMS_MCP_MAX_SESSIONS: 100,
      CMS_MCP_ALLOWED_ORIGINS: "*",
    });
  });

  it("parses bounded session and CORS configuration", () => {
    expect(
      parseHttpMcpEnvironment({
        ...valid,
        CMS_MCP_SESSION_IDLE_TIMEOUT_MS: "60000",
        CMS_MCP_MAX_SESSIONS: "12",
        CMS_MCP_ALLOWED_ORIGINS: "https://cms.example.com",
      }),
    ).toMatchObject({
      CMS_MCP_SESSION_IDLE_TIMEOUT_MS: 60_000,
      CMS_MCP_MAX_SESSIONS: 12,
      CMS_MCP_ALLOWED_ORIGINS: "https://cms.example.com",
    });
  });

  it("rejects unbounded session configuration", () => {
    expect(() =>
      parseHttpMcpEnvironment({
        ...valid,
        CMS_MCP_SESSION_IDLE_TIMEOUT_MS: "10",
      }),
    ).toThrow();
    expect(() =>
      parseHttpMcpEnvironment({ ...valid, CMS_MCP_MAX_SESSIONS: "0" }),
    ).toThrow();
  });
});
