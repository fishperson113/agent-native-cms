import { tenantId } from "@/shared/kernel/identifiers";

import type { McpCredentialRepository } from "../domain/mcp-credential.repository";
import type { McpCredentialRole } from "../domain/mcp-credential";
import { toMcpCredentialDto } from "./mcp-credential.dto";

export class ListMcpCredentialsHandler {
  constructor(private readonly credentials: McpCredentialRepository) {}

  async execute(filter?: { role?: McpCredentialRole; tenantId?: string }) {
    return (
      await this.credentials.list({
        role: filter?.role,
        tenantId: filter?.tenantId ? tenantId(filter.tenantId) : undefined,
      })
    ).map(toMcpCredentialDto);
  }
}
