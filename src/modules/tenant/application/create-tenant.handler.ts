import type { TenantRepository } from "../domain/tenant.repository";
import { TenantSlug } from "../domain/tenant-slug";
import { Tenant } from "../domain/tenant";
import { TenantAlreadyExistsError } from "../domain/tenant.errors";
import type { Clock } from "@/shared/kernel/ports/clock";
import type { IdGenerator } from "@/shared/kernel/ports/id-generator";
import { tenantId } from "@/shared/kernel/identifiers";

import { toTenantDto } from "./tenant.dto";

export class CreateTenantHandler {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: { name: string; slug: string }) {
    const slug = TenantSlug.create(command.slug);
    if (await this.tenants.findBySlug(slug)) {
      throw new TenantAlreadyExistsError();
    }
    const tenant = Tenant.create({
      id: tenantId(this.ids.generate()),
      name: command.name,
      slug: slug.value,
      now: this.clock.now(),
    });
    await this.tenants.save(tenant);
    return toTenantDto(tenant);
  }
}
