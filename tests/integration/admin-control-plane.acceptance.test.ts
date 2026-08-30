import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { createDatabase } from "@/infrastructure/database/client";
import { AdminRuntime } from "@/integrations/admin/admin-runtime";

const connectionString = process.env.DATABASE_URL!;
const database = createDatabase(connectionString);
const access = createMcpAccessServices(database.db);
const runtime = new AdminRuntime(connectionString);

afterAll(async () => {
  await runtime.close();
  await database.close();
});

describe("admin REST control-plane services", () => {
  it("exchanges an admin key for a revocable server-side session", async () => {
    const admin = await access.issueCredential.execute({
      role: "admin",
      name: `Acceptance operator ${randomUUID()}`,
    });
    const login = await runtime.login(admin.plaintextKey);
    expect(login?.token).toBeTruthy();
    await expect(runtime.authenticateSession(login?.token)).resolves.toEqual({
      credentialId: admin.credential.id,
    });
    const snapshot = await runtime.snapshot();
    expect(snapshot.credentials).not.toContainEqual(
      expect.objectContaining({ id: admin.credential.id }),
    );
    expect(JSON.stringify(snapshot)).not.toContain(admin.plaintextKey);

    await runtime.revokeCredential(admin.credential.id);
    await expect(runtime.authenticateSession(login?.token)).resolves.toBeNull();
  });

  it("keeps tenant keys recoverable only through the admin snapshot", async () => {
    const suffix = randomUUID().slice(0, 8);
    const tenant = await runtime.createTenant({
      name: `Control tenant ${suffix}`,
      slug: `control-tenant-${suffix}`,
    });
    const issued = await runtime.issueTenantCredential({
      tenantId: tenant.id,
      name: "Acceptance coding agent",
    });
    expect(issued.credential).toMatchObject({
      role: "tenant",
      tenantId: tenant.id,
    });
    expect(issued.plaintextKey).toMatch(/^cms_[a-f0-9]{12}_/);

    const snapshot = await runtime.snapshot();
    expect(snapshot.credentials).toContainEqual(
      expect.objectContaining({
        id: issued.credential.id,
        keyPrefix: issued.credential.keyPrefix,
      }),
    );
    expect(snapshot.credentials).toContainEqual(
      expect.objectContaining({
        id: issued.credential.id,
        plaintextKey: issued.plaintextKey,
      }),
    );
  });
});
