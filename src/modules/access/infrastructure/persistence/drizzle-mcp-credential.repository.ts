import { and, asc, eq, type SQL } from "drizzle-orm";

import type { DatabaseExecutor } from "@/infrastructure/database/client";
import { mcpCredentials } from "@/infrastructure/database/schema";
import type {
  ListMcpCredentialsFilter,
  McpCredentialRepository,
} from "@/modules/access/domain/mcp-credential.repository";
import type { McpCredential } from "@/modules/access/domain/mcp-credential";
import type { McpCredentialId } from "@/shared/kernel/identifiers";

import { McpCredentialPersistenceMapper } from "./mcp-credential-persistence.mapper";

export class DrizzleMcpCredentialRepository
  implements McpCredentialRepository
{
  constructor(private readonly db: DatabaseExecutor) {}

  async findById(id: McpCredentialId): Promise<McpCredential | null> {
    const [row] = await this.db
      .select()
      .from(mcpCredentials)
      .where(eq(mcpCredentials.id, id))
      .limit(1);
    return row ? McpCredentialPersistenceMapper.toDomain(row) : null;
  }

  async findByKeyPrefix(keyPrefix: string): Promise<McpCredential | null> {
    const [row] = await this.db
      .select()
      .from(mcpCredentials)
      .where(eq(mcpCredentials.keyPrefix, keyPrefix))
      .limit(1);
    return row ? McpCredentialPersistenceMapper.toDomain(row) : null;
  }

  async list(filter: ListMcpCredentialsFilter = {}): Promise<McpCredential[]> {
    const predicates: SQL[] = [];
    if (filter.role) predicates.push(eq(mcpCredentials.role, filter.role));
    if (filter.tenantId) {
      predicates.push(eq(mcpCredentials.tenantId, filter.tenantId));
    }
    const rows = await this.db
      .select()
      .from(mcpCredentials)
      .where(predicates.length > 0 ? and(...predicates) : undefined)
      .orderBy(asc(mcpCredentials.createdAt));
    return rows.map(McpCredentialPersistenceMapper.toDomain);
  }

  async save(credential: McpCredential): Promise<void> {
    const record = McpCredentialPersistenceMapper.toPersistence(credential);
    await this.db
      .insert(mcpCredentials)
      .values(record)
      .onConflictDoUpdate({
        target: mcpCredentials.id,
        set: {
          name: record.name,
          note: record.note,
          lastUsedAt: record.lastUsedAt,
          revokedAt: record.revokedAt,
        },
      });
  }
}
