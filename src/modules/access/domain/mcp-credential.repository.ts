import type { TenantId } from "@/shared/kernel/identifiers";
import type { McpCredentialId } from "@/shared/kernel/identifiers";

import type { McpCredentialRole } from "./mcp-credential";
import type { McpCredential } from "./mcp-credential";

export type ListMcpCredentialsFilter = {
  role?: McpCredentialRole;
  tenantId?: TenantId;
};

export interface McpCredentialRepository {
  findById(id: McpCredentialId): Promise<McpCredential | null>;
  findByKeyPrefix(keyPrefix: string): Promise<McpCredential | null>;
  list(filter?: ListMcpCredentialsFilter): Promise<McpCredential[]>;
  save(credential: McpCredential): Promise<void>;
}
