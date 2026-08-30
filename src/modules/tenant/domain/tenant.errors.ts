import { DomainError } from "@/shared/kernel/domain-error";

export class TenantNameRequiredError extends DomainError {
  readonly code = "TENANT_NAME_REQUIRED";

  constructor() {
    super("Tenant name is required.");
  }
}

export class InvalidTenantSlugError extends DomainError {
  readonly code = "INVALID_TENANT_SLUG";

  constructor(value: string) {
    super(`Tenant slug "${value}" is invalid.`);
  }
}

export class TenantDisabledError extends DomainError {
  readonly code = "TENANT_DISABLED";

  constructor() {
    super("Disabled tenants cannot create content.");
  }
}

export class TenantAlreadyExistsError extends DomainError {
  readonly code = "TENANT_ALREADY_EXISTS";

  constructor() {
    super("A tenant with that ID or slug already exists.");
  }
}

export class TenantNotFoundForAdministrationError extends DomainError {
  readonly code = "TENANT_NOT_FOUND";

  constructor() {
    super("Tenant was not found.");
  }
}
