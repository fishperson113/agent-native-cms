import { mcpCredentialId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";

import { McpCredentialNotFoundError } from "../domain/mcp-credential.errors";
import type { McpCredentialRepository } from "../domain/mcp-credential.repository";
import { toMcpCredentialDto } from "./mcp-credential.dto";

export class RevokeMcpCredentialHandler {
  constructor(
    private readonly credentials: McpCredentialRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: { credentialId: string }) {
    const credential = await this.credentials.findById(
      mcpCredentialId(command.credentialId),
    );
    if (!credential) throw new McpCredentialNotFoundError();
    credential.revoke(this.clock.now());
    await this.credentials.save(credential);
    return toMcpCredentialDto(credential);
  }
}
