import type { McpCredentialRow } from "@/infrastructure/database/schema";
import { McpCredential } from "@/modules/access/domain/mcp-credential";
import {
  mcpCredentialId,
  tenantId,
} from "@/shared/kernel/identifiers";

export class McpCredentialPersistenceMapper {
  static toDomain(row: McpCredentialRow): McpCredential {
    return McpCredential.reconstitute({
      id: mcpCredentialId(row.id),
      role: row.role,
      tenantId: row.tenantId ? tenantId(row.tenantId) : null,
      name: row.name,
      note: row.note,
      keyPrefix: row.keyPrefix,
      keyHash: row.keyHash,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
    });
  }

  static toPersistence(credential: McpCredential) {
    const snapshot = credential.toSnapshot();
    return {
      id: snapshot.id,
      role: snapshot.role,
      tenantId: snapshot.tenantId,
      name: snapshot.name,
      note: snapshot.note,
      keyPrefix: snapshot.keyPrefix,
      keyHash: snapshot.keyHash,
      createdAt: snapshot.createdAt,
      lastUsedAt: snapshot.lastUsedAt,
      revokedAt: snapshot.revokedAt,
    };
  }
}
