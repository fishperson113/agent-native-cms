import type { Tenant } from "../domain/tenant";

export type TenantDto = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
};

export function toTenantDto(tenant: Tenant): TenantDto {
  return tenant.toSnapshot();
}
