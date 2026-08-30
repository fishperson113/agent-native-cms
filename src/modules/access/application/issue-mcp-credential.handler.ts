import type { McpCredentialRepository } from "../domain/mcp-credential.repository";
import type { McpCredentialRole } from "../domain/mcp-credential";
import { McpCredential } from "../domain/mcp-credential";
import { McpKeyPrefixCollisionError } from "../domain/mcp-credential.errors";
import type { TenantRepository } from "@/modules/tenant/domain/tenant.repository";
import { TenantNotFoundError } from "@/modules/content/domain/article.errors";
import type { Clock } from "@/shared/kernel/ports/clock";
import type { IdGenerator } from "@/shared/kernel/ports/id-generator";
import { mcpCredentialId, tenantId } from "@/shared/kernel/identifiers";

import type { McpKeyService } from "./mcp-key-service";
import { toMcpCredentialDto } from "./mcp-credential.dto";

export type IssueMcpCredentialCommand = {
  role: McpCredentialRole;
  tenantId?: string;
  name: string;
  note?: string;
  plaintextKey?: string;
};

export class IssueMcpCredentialHandler {
  constructor(
    private readonly credentials: McpCredentialRepository,
    private readonly tenants: TenantRepository,
    private readonly keys: McpKeyService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: IssueMcpCredentialCommand) {
    const ownerId = command.tenantId ? tenantId(command.tenantId) : null;
    if (command.role === "tenant") {
      if (!ownerId) throw new TenantNotFoundError();
      const tenant = await this.tenants.findById(ownerId);
      if (!tenant) throw new TenantNotFoundError();
      tenant.assertCanCreateContent();
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const generated = command.plaintextKey
        ? {
            plaintext: command.plaintextKey,
            prefix: this.keys.prefixFor(command.plaintextKey),
          }
        : this.keys.generate();
      if (await this.credentials.findByKeyPrefix(generated.prefix)) {
        if (command.plaintextKey) throw new McpKeyPrefixCollisionError();
        continue;
      }

      const credential = McpCredential.create({
        id: mcpCredentialId(this.ids.generate()),
        role: command.role,
        tenantId: ownerId,
        name: command.name,
        note: command.note ?? null,
        keyPrefix: generated.prefix,
        keyHash: await this.keys.hash(generated.plaintext),
        createdAt: this.clock.now(),
        lastUsedAt: null,
        revokedAt: null,
      });
      await this.credentials.save(credential);
      return {
        credential: toMcpCredentialDto(credential),
        plaintextKey: generated.plaintext,
      };
    }
    throw new McpKeyPrefixCollisionError();
  }
}
