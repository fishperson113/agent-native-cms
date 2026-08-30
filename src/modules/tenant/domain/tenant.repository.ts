import type { TenantId } from "@/shared/kernel/identifiers";

import type { Tenant } from "./tenant";
import type { TenantSlug } from "./tenant-slug";

export interface TenantRepository {
  findById(id: TenantId): Promise<Tenant | null>;
  findBySlug(slug: TenantSlug): Promise<Tenant | null>;
  list(): Promise<Tenant[]>;
  save(tenant: Tenant): Promise<void>;
}
