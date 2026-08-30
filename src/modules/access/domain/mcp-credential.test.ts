import { describe, expect, it } from "vitest";

import {
  mcpCredentialId,
  tenantId,
} from "@/shared/kernel/identifiers";

import {
  InvalidMcpCredentialBindingError,
  McpCredentialNameRequiredError,
} from "./mcp-credential.errors";
import { McpCredential } from "./mcp-credential";

const base = {
  id: mcpCredentialId("90000000-0000-4000-8000-000000000001"),
  name: "Agent key",
  note: null,
  keyPrefix: "cms_123456789abc",
  keyHash: "hash",
  createdAt: new Date("2026-08-28T00:00:00.000Z"),
  lastUsedAt: null,
  revokedAt: null,
};

describe("McpCredential", () => {
  it("enforces the admin and tenant binding invariant", () => {
    expect(() =>
      McpCredential.create({
        ...base,
        role: "admin",
        tenantId: tenantId("10000000-0000-4000-8000-000000000001"),
      }),
    ).toThrow(InvalidMcpCredentialBindingError);
    expect(() =>
      McpCredential.create({ ...base, role: "tenant", tenantId: null }),
    ).toThrow(InvalidMcpCredentialBindingError);
  });

  it("requires an operator-facing name", () => {
    expect(() =>
      McpCredential.create({
        ...base,
        role: "admin",
        tenantId: null,
        name: " ",
      }),
    ).toThrow(McpCredentialNameRequiredError);
  });

  it("records use and revocation timestamps idempotently", () => {
    const credential = McpCredential.create({
      ...base,
      role: "admin",
      tenantId: null,
    });
    const usedAt = new Date("2026-08-28T01:00:00.000Z");
    const revokedAt = new Date("2026-08-28T02:00:00.000Z");
    credential.markUsed(usedAt);
    credential.revoke(revokedAt);
    credential.revoke(new Date("2026-08-28T03:00:00.000Z"));

    expect(credential.toSnapshot()).toMatchObject({
      lastUsedAt: usedAt,
      revokedAt,
    });
  });
});
