import { InvalidTenantSlugError } from "./tenant.errors";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class TenantSlug {
  private constructor(readonly value: string) {}

  static create(value: string): TenantSlug {
    const normalized = value.trim();

    if (
      normalized.length === 0 ||
      normalized.length > 80 ||
      !slugPattern.test(normalized)
    ) {
      throw new InvalidTenantSlugError(value);
    }

    return new TenantSlug(normalized);
  }
}
