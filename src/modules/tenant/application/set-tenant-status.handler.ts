import type { TenantRepository } from "../domain/tenant.repository";
import type { Clock } from "@/shared/kernel/ports/clock";
import { tenantId } from "@/shared/kernel/identifiers";

import { TenantNotFoundForAdministrationError } from "../domain/tenant.errors";
import { toTenantDto } from "./tenant.dto";

export class SetTenantStatusHandler {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: {
    tenantId: string;
    status: "active" | "disabled";
  }) {
    const tenant = await this.tenants.findById(tenantId(command.tenantId));
    if (!tenant) throw new TenantNotFoundForAdministrationError();
    if (command.status === "active") tenant.enable(this.clock.now());
    else tenant.disable(this.clock.now());
    await this.tenants.save(tenant);
    return toTenantDto(tenant);
  }
}
