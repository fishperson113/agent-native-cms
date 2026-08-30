import type { NewTenantRow, TenantRow } from "@/infrastructure/database/schema";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { tenantId } from "@/shared/kernel/identifiers";

export class TenantPersistenceMapper {
  static toDomain(row: TenantRow): Tenant {
    return Tenant.reconstitute({
      id: tenantId(row.id),
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(tenant: Tenant): NewTenantRow {
    const snapshot = tenant.toSnapshot();
    return {
      id: snapshot.id,
      name: snapshot.name,
      slug: snapshot.slug,
      status: snapshot.status,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  }
}
