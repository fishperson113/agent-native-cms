import type { TenantRepository } from "../domain/tenant.repository";

import { toTenantDto } from "./tenant.dto";

export class ListTenantsHandler {
  constructor(private readonly tenants: TenantRepository) {}

  async execute() {
    return (await this.tenants.list()).map(toTenantDto);
  }
}
