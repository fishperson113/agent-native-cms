import type {
  McpCredentialId,
  TenantId,
} from "@/shared/kernel/identifiers";

import {
  InvalidMcpCredentialBindingError,
  McpCredentialNameRequiredError,
} from "./mcp-credential.errors";

export type McpCredentialRole = "admin" | "tenant";

export type McpCredentialSnapshot = {
  id: McpCredentialId;
  role: McpCredentialRole;
  tenantId: TenantId | null;
  name: string;
  note: string | null;
  keyPrefix: string;
  keyHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export class McpCredential {
  private constructor(private snapshot: McpCredentialSnapshot) {}

  static create(input: McpCredentialSnapshot): McpCredential {
    return new McpCredential(McpCredential.validate(input));
  }

  static reconstitute(snapshot: McpCredentialSnapshot): McpCredential {
    return new McpCredential(McpCredential.validate(snapshot));
  }

  private static validate(
    snapshot: McpCredentialSnapshot,
  ): McpCredentialSnapshot {
    const name = snapshot.name.trim();
    if (!name) throw new McpCredentialNameRequiredError();
    if (
      (snapshot.role === "admin" && snapshot.tenantId !== null) ||
      (snapshot.role === "tenant" && snapshot.tenantId === null)
    ) {
      throw new InvalidMcpCredentialBindingError();
    }
    return { ...snapshot, name, note: snapshot.note?.trim() || null };
  }

  get id(): McpCredentialId {
    return this.snapshot.id;
  }

  get role(): McpCredentialRole {
    return this.snapshot.role;
  }

  get tenantId(): TenantId | null {
    return this.snapshot.tenantId;
  }

  get keyPrefix(): string {
    return this.snapshot.keyPrefix;
  }

  get keyHash(): string {
    return this.snapshot.keyHash;
  }

  get revoked(): boolean {
    return this.snapshot.revokedAt !== null;
  }

  markUsed(now: Date): void {
    this.snapshot = { ...this.snapshot, lastUsedAt: now };
  }

  revoke(now: Date): void {
    if (!this.snapshot.revokedAt) {
      this.snapshot = { ...this.snapshot, revokedAt: now };
    }
  }

  toSnapshot(): McpCredentialSnapshot {
    return { ...this.snapshot };
  }
}
