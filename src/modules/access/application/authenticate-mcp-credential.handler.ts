import type { TenantRepository } from "@/modules/tenant/domain/tenant.repository";

import type { McpCredentialRepository } from "../domain/mcp-credential.repository";
import type { McpKeyService } from "./mcp-key-service";

export type McpActorContext =
  | { role: "admin"; credentialId: string }
  | { role: "tenant"; credentialId: string; tenantId: string };

export type AuthenticateMcpCredentialResult =
  | { outcome: "authenticated"; actor: McpActorContext }
  | {
      outcome: "revoked" | "tenant_disabled";
      credentialId: string;
    }
  | { outcome: "invalid" };

export class AuthenticateMcpCredentialHandler {
  constructor(
    private readonly credentials: McpCredentialRepository,
    private readonly tenants: TenantRepository,
    private readonly keys: McpKeyService,
    private readonly getTime: () => Date = () => new Date(),
  ) {}

  async execute(plaintextKey: string): Promise<AuthenticateMcpCredentialResult> {
    const prefix = this.keys.prefixFor(plaintextKey);
    const credential = await this.credentials.findByKeyPrefix(prefix);
    if (
      !credential ||
      !(await this.keys.verify(plaintextKey, credential.keyHash))
    ) {
      return { outcome: "invalid" };
    }
    if (credential.revoked) {
      return { outcome: "revoked", credentialId: credential.id };
    }
    if (credential.role === "tenant") {
      const tenant = await this.tenants.findById(credential.tenantId!);
      if (!tenant || tenant.status === "disabled") {
        return {
          outcome: "tenant_disabled",
          credentialId: credential.id,
        };
      }
    }

    credential.markUsed(this.getTime());
    await this.credentials.save(credential);
    return credential.role === "admin"
      ? {
          outcome: "authenticated",
          actor: { role: "admin", credentialId: credential.id },
        }
      : {
          outcome: "authenticated",
          actor: {
            role: "tenant",
            credentialId: credential.id,
            tenantId: credential.tenantId!,
          },
        };
  }
}
