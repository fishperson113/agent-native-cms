import { describe, expect, it } from "vitest";

import {
  authenticateHttpMcpRequest,
  createMcpCorsHeaders,
} from "./http-security";

describe("HTTP MCP security", () => {
  it("returns a non-secret stable identity for a valid bearer key", () => {
    const key = "a-valid-secret-key";
    const identity = authenticateHttpMcpRequest(
      new Request("http://localhost/api/mcp", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      key,
    );
    expect(identity).toMatch(/^[a-f0-9]{64}$/);
    expect(identity).not.toContain(key);
  });

  it("rejects missing and incorrect bearer keys", () => {
    expect(
      authenticateHttpMcpRequest(
        new Request("http://localhost/api/mcp"),
        "expected-secret-key",
      ),
    ).toBeUndefined();
    expect(
      authenticateHttpMcpRequest(
        new Request("http://localhost/api/mcp", {
          headers: { Authorization: "Bearer incorrect-secret" },
        }),
        "expected-secret-key",
      ),
    ).toBeUndefined();
  });

  it("reflects only explicitly allowed origins", () => {
    const allowed = createMcpCorsHeaders(
      new Request("http://localhost/api/mcp", {
        headers: { Origin: "https://cms.example.com" },
      }),
      "https://cms.example.com,https://agent.example.com",
    );
    const denied = createMcpCorsHeaders(
      new Request("http://localhost/api/mcp", {
        headers: { Origin: "https://evil.example.com" },
      }),
      "https://cms.example.com",
    );
    expect(allowed.get("access-control-allow-origin")).toBe(
      "https://cms.example.com",
    );
    expect(denied.has("access-control-allow-origin")).toBe(false);
  });
});
