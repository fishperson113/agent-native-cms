import type { McpCredential } from "../domain/mcp-credential";

export type McpCredentialDto = {
  id: string;
  role: "admin" | "tenant";
  tenantId: string | null;
  name: string;
  note: string | null;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export function toMcpCredentialDto(
  credential: McpCredential,
): McpCredentialDto {
  const snapshot = credential.toSnapshot();
  return {
    id: snapshot.id,
    role: snapshot.role,
    tenantId: snapshot.tenantId,
    name: snapshot.name,
    note: snapshot.note,
    keyPrefix: snapshot.keyPrefix,
    createdAt: snapshot.createdAt,
    lastUsedAt: snapshot.lastUsedAt,
    revokedAt: snapshot.revokedAt,
  };
}
