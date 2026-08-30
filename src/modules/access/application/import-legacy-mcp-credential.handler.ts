import type { McpCredentialRepository } from "../domain/mcp-credential.repository";
import { McpKeyPrefixCollisionError } from "../domain/mcp-credential.errors";
import type { McpKeyService } from "./mcp-key-service";
import { toMcpCredentialDto } from "./mcp-credential.dto";
import type { IssueMcpCredentialHandler } from "./issue-mcp-credential.handler";

export class ImportLegacyMcpCredentialHandler {
  constructor(
    private readonly credentials: McpCredentialRepository,
    private readonly keys: McpKeyService,
    private readonly issueCredential: IssueMcpCredentialHandler,
  ) {}

  async execute(command: {
    tenantId: string;
    plaintextKey: string;
    name: string;
    note?: string;
  }) {
    const prefix = this.keys.prefixFor(command.plaintextKey);
    const existing = await this.credentials.findByKeyPrefix(prefix);
    if (existing) {
      if (!(await this.keys.verify(command.plaintextKey, existing.keyHash))) {
        throw new McpKeyPrefixCollisionError();
      }
      return {
        credential: toMcpCredentialDto(existing),
        imported: false,
      };
    }

    const issued = await this.issueCredential.execute({
      role: "tenant",
      tenantId: command.tenantId,
      plaintextKey: command.plaintextKey,
      name: command.name,
      note: command.note,
    });
    return { credential: issued.credential, imported: true };
  }
}
