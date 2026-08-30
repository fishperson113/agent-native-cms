import { ActiveAdminCredentialExistsError } from "../domain/mcp-credential.errors";
import type { McpCredentialRepository } from "../domain/mcp-credential.repository";
import type {
  IssueMcpCredentialCommand,
  IssueMcpCredentialHandler,
} from "./issue-mcp-credential.handler";

export class BootstrapAdminCredentialHandler {
  constructor(
    private readonly credentials: McpCredentialRepository,
    private readonly issueCredential: IssueMcpCredentialHandler,
  ) {}

  async execute(command: Omit<IssueMcpCredentialCommand, "role" | "tenantId">) {
    const admins = await this.credentials.list({ role: "admin" });
    if (admins.some((credential) => !credential.revoked)) {
      throw new ActiveAdminCredentialExistsError();
    }
    return this.issueCredential.execute({ ...command, role: "admin" });
  }
}
