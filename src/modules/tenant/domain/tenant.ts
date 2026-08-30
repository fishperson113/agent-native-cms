import type { TenantId } from "@/shared/kernel/identifiers";

import {
  TenantDisabledError,
  TenantNameRequiredError,
} from "./tenant.errors";
import { TenantSlug } from "./tenant-slug";

export type TenantStatus = "active" | "disabled";

export type TenantSnapshot = {
  id: TenantId;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
};

type CreateTenantInput = {
  id: TenantId;
  name: string;
  slug: string;
  now: Date;
};

export class Tenant {
  private constructor(
    readonly id: TenantId,
    private nameValue: string,
    readonly slug: TenantSlug,
    private statusValue: TenantStatus,
    readonly createdAt: Date,
    private updatedAtValue: Date,
  ) {}

  static create(input: CreateTenantInput): Tenant {
    const name = input.name.trim();
    if (!name) {
      throw new TenantNameRequiredError();
    }

    return new Tenant(
      input.id,
      name,
      TenantSlug.create(input.slug),
      "active",
      input.now,
      input.now,
    );
  }

  static reconstitute(snapshot: TenantSnapshot): Tenant {
    const name = snapshot.name.trim();
    if (!name) {
      throw new TenantNameRequiredError();
    }

    return new Tenant(
      snapshot.id,
      name,
      TenantSlug.create(snapshot.slug),
      snapshot.status,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get name(): string {
    return this.nameValue;
  }

  get status(): TenantStatus {
    return this.statusValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  assertCanCreateContent(): void {
    if (this.statusValue === "disabled") {
      throw new TenantDisabledError();
    }
  }

  disable(now: Date): void {
    this.statusValue = "disabled";
    this.updatedAtValue = now;
  }

  enable(now: Date): void {
    this.statusValue = "active";
    this.updatedAtValue = now;
  }

  toSnapshot(): TenantSnapshot {
    return {
      id: this.id,
      name: this.nameValue,
      slug: this.slug.value,
      status: this.statusValue,
      createdAt: this.createdAt,
      updatedAt: this.updatedAtValue,
    };
  }
}
