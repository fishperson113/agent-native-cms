import { config } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import { mcpCredentials } from "@/infrastructure/database/schema";
import { ActiveAdminCredentialExistsError } from "@/modules/access/domain/mcp-credential.errors";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { tenantId } from "@/shared/kernel/identifiers";

config({ path: ".env", quiet: true });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const services = createMcpAccessServices(database.db);
const tenants = new DrizzleTenantRepository(database.db);
const ownerId = tenantId("10000000-0000-4000-8000-000000000088");

beforeEach(async () => {
  await database.db.delete(mcpCredentials);
  await tenants.save(
    Tenant.create({
      id: ownerId,
      name: "Credential Acceptance",
      slug: "credential-acceptance",
      now: new Date("2026-08-28T00:00:00.000Z"),
    }),
  );
});

afterAll(async () => {
  await database.close();
});

describe("MCP credential management", () => {
  it("issues independently revocable tenant keys and resolves actor context", async () => {
    const first = await services.issueCredential.execute({
      role: "tenant",
      tenantId: ownerId,
      name: "Agent one",
    });
    const second = await services.issueCredential.execute({
      role: "tenant",
      tenantId: ownerId,
      name: "Agent two",
    });

    expect(first.plaintextKey).not.toBe(second.plaintextKey);
    await expect(
      services.authenticateCredential.execute(first.plaintextKey),
    ).resolves.toMatchObject({
      outcome: "authenticated",
      actor: { role: "tenant", tenantId: ownerId },
    });

    await services.revokeCredential.execute({
      credentialId: first.credential.id,
    });
    await expect(
      services.authenticateCredential.execute(first.plaintextKey),
    ).resolves.toMatchObject({ outcome: "revoked" });
    await expect(
      services.authenticateCredential.execute(second.plaintextKey),
    ).resolves.toMatchObject({ outcome: "authenticated" });
  });

  it("bootstraps only one active admin and never lists a key hash", async () => {
    const admin = await services.bootstrapAdminCredential.execute({
      name: "Root operator",
    });
    await expect(
      services.authenticateCredential.execute(admin.plaintextKey),
    ).resolves.toMatchObject({
      outcome: "authenticated",
      actor: { role: "admin" },
    });
    await expect(
      services.bootstrapAdminCredential.execute({ name: "Another admin" }),
    ).rejects.toThrow(ActiveAdminCredentialExistsError);

    const listed = await services.listCredentials.execute();
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain("keyHash");
    expect(JSON.stringify(listed)).not.toContain(admin.plaintextKey);
  });

  it("blocks authentication when the owning tenant is disabled", async () => {
    const issued = await services.issueCredential.execute({
      role: "tenant",
      tenantId: ownerId,
      name: "Disabled tenant agent",
    });
    await services.setTenantStatus.execute({
      tenantId: ownerId,
      status: "disabled",
    });

    await expect(
      services.authenticateCredential.execute(issued.plaintextKey),
    ).resolves.toMatchObject({ outcome: "tenant_disabled" });
  });

  it("imports the existing fixed key idempotently", async () => {
    const plaintextKey = "legacy-fixed-key-with-enough-entropy-123";
    const first = await services.importLegacyCredential.execute({
      tenantId: ownerId,
      plaintextKey,
      name: "Legacy key",
    });
    const second = await services.importLegacyCredential.execute({
      tenantId: ownerId,
      plaintextKey,
      name: "Legacy key",
    });

    expect(first.imported).toBe(true);
    expect(second.imported).toBe(false);
    expect(second.credential.id).toBe(first.credential.id);
  });
});
