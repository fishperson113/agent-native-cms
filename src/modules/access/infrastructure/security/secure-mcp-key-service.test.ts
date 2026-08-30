import { describe, expect, it } from "vitest";

import { SecureMcpKeyService } from "./secure-mcp-key-service";

describe("SecureMcpKeyService", () => {
  it("generates structured high-entropy keys and verifies scrypt hashes", async () => {
    const service = new SecureMcpKeyService();
    const generated = service.generate();
    const encodedHash = await service.hash(generated.plaintext);

    expect(generated.plaintext).toMatch(/^cms_[a-f0-9]{12}_[\w-]{43}$/);
    expect(service.prefixFor(generated.plaintext)).toBe(generated.prefix);
    expect(encodedHash).not.toContain(generated.plaintext);
    await expect(
      service.verify(generated.plaintext, encodedHash),
    ).resolves.toBe(true);
    await expect(service.verify("wrong-key", encodedHash)).resolves.toBe(false);
  });

  it("derives a non-secret stable prefix for imported legacy keys", () => {
    const service = new SecureMcpKeyService();
    const prefix = service.prefixFor("an-existing-long-environment-key");
    expect(prefix).toMatch(/^legacy_[a-f0-9]{12}$/);
    expect(prefix).not.toContain("environment-key");
  });
});
