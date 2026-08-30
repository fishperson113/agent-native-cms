import { describe, expect, it } from "vitest";

import { tenantId } from "@/shared/kernel/identifiers";

import {
  InvalidTenantSlugError,
  TenantDisabledError,
  TenantNameRequiredError,
} from "./tenant.errors";
import { Tenant } from "./tenant";

const id = tenantId("10000000-0000-4000-8000-000000000001");
const now = new Date("2026-08-27T00:00:00.000Z");

describe("Tenant", () => {
  it("creates an active tenant with immutable identity", () => {
    const tenant = Tenant.create({ id, name: " Acme ", slug: "acme", now });

    expect(tenant.id).toBe(id);
    expect(tenant.name).toBe("Acme");
    expect(tenant.slug.value).toBe("acme");
    expect(tenant.status).toBe("active");
  });

  it("requires a name", () => {
    expect(() =>
      Tenant.create({ id, name: "  ", slug: "acme", now }),
    ).toThrow(TenantNameRequiredError);
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      Tenant.create({ id, name: "Acme", slug: "Acme Space", now }),
    ).toThrow(InvalidTenantSlugError);
  });

  it("prevents a disabled tenant from creating content", () => {
    const tenant = Tenant.create({ id, name: "Acme", slug: "acme", now });
    tenant.disable(new Date("2026-08-28T00:00:00.000Z"));

    expect(() => tenant.assertCanCreateContent()).toThrow(TenantDisabledError);
  });
});
