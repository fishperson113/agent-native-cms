import { config } from "dotenv";

import { parseEnvironment } from "@/infrastructure/config/environment";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { tenantId } from "@/shared/kernel/identifiers";

import { createDatabase } from "./client";

config({ path: ".env" });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const tenants = new DrizzleTenantRepository(database.db);
const now = new Date();

const seeds = [
  Tenant.create({
    id: tenantId("10000000-0000-4000-8000-000000000001"),
    name: "Acme Workspace",
    slug: "acme",
    now,
  }),
  Tenant.create({
    id: tenantId("10000000-0000-4000-8000-000000000002"),
    name: "Beta Workspace",
    slug: "beta",
    now,
  }),
];

try {
  for (const tenant of seeds) {
    await tenants.save(tenant);
  }
  console.info(`Seeded ${seeds.length} tenants.`);
} finally {
  await database.close();
}
