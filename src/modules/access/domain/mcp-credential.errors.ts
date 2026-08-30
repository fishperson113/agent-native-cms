import { DomainError } from "@/shared/kernel/domain-error";

export class McpCredentialNameRequiredError extends DomainError {
  readonly code = "MCP_CREDENTIAL_NAME_REQUIRED";

  constructor() {
    super("MCP credential name is required.");
  }
}

export class InvalidMcpCredentialBindingError extends DomainError {
  readonly code = "INVALID_MCP_CREDENTIAL_BINDING";

  constructor() {
    super("Admin credentials cannot bind a tenant; tenant credentials must.");
  }
}

export class McpCredentialNotFoundError extends DomainError {
  readonly code = "MCP_CREDENTIAL_NOT_FOUND";

  constructor() {
    super("MCP credential was not found.");
  }
}

export class ActiveAdminCredentialExistsError extends DomainError {
  readonly code = "ACTIVE_ADMIN_CREDENTIAL_EXISTS";

  constructor() {
    super("An active admin credential already exists.");
  }
}

export class McpKeyPrefixCollisionError extends DomainError {
  readonly code = "MCP_KEY_PREFIX_COLLISION";

  constructor() {
    super("Could not generate a unique MCP key prefix.");
  }
}
