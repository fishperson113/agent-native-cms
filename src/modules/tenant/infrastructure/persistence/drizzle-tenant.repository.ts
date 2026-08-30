import { asc, eq } from "drizzle-orm";

import type { DatabaseExecutor } from "@/infrastructure/database/client";
import { tenants } from "@/infrastructure/database/schema";
import type { TenantRepository } from "@/modules/tenant/domain/tenant.repository";
import type { Tenant } from "@/modules/tenant/domain/tenant";
import type { TenantSlug } from "@/modules/tenant/domain/tenant-slug";
import type { TenantId } from "@/shared/kernel/identifiers";

import { TenantPersistenceMapper } from "./tenant-persistence.mapper";

export class DrizzleTenantRepository implements TenantRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async findById(id: TenantId): Promise<Tenant | null> {
    const [row] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    return row ? TenantPersistenceMapper.toDomain(row) : null;
  }

  async findBySlug(slug: TenantSlug): Promise<Tenant | null> {
    const [row] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug.value))
      .limit(1);

    return row ? TenantPersistenceMapper.toDomain(row) : null;
  }

  async list(): Promise<Tenant[]> {
    const rows = await this.db.select().from(tenants).orderBy(asc(tenants.name));
    return rows.map(TenantPersistenceMapper.toDomain);
  }

  async save(tenant: Tenant): Promise<void> {
    const record = TenantPersistenceMapper.toPersistence(tenant);
    await this.db
      .insert(tenants)
      .values(record)
      .onConflictDoUpdate({
        target: tenants.id,
        set: {
          name: record.name,
          slug: record.slug,
          status: record.status,
          updatedAt: record.updatedAt,
        },
      });
  }
}
