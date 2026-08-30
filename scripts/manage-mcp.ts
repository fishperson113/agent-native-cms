import { config } from "dotenv";

import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import type { McpCredentialRole } from "@/modules/access/domain/mcp-credential";

config({ path: ".env", quiet: true });

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredOption(name: string): string {
  const value = option(name);
  if (!value || value.startsWith("--")) {
    throw new Error(`--${name} is required.`);
  }
  return value;
}

function confirmed(): boolean {
  return process.argv.includes("--confirm");
}

function print(value: unknown): void {
  console.info(JSON.stringify(value, null, 2));
}

const command = process.argv[2];
const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const services = createMcpAccessServices(database.db);

try {
  switch (command) {
    case "bootstrap-admin": {
      if (!confirmed()) {
        throw new Error("bootstrap-admin requires --confirm.");
      }
      const result = await services.bootstrapAdminCredential.execute({
        name: requiredOption("name"),
        note: option("note"),
      });
      print({
        ...result,
        warning: "Store plaintextKey now. It cannot be recovered later.",
      });
      break;
    }
    case "tenant:list":
      print({ tenants: await services.listTenants.execute() });
      break;
    case "tenant:create":
      print({
        tenant: await services.createTenant.execute({
          name: requiredOption("name"),
          slug: requiredOption("slug"),
        }),
      });
      break;
    case "tenant:set-status": {
      const status = requiredOption("status");
      if (status !== "active" && status !== "disabled") {
        throw new Error("--status must be active or disabled.");
      }
      print({
        tenant: await services.setTenantStatus.execute({
          tenantId: requiredOption("tenant-id"),
          status,
        }),
      });
      break;
    }
    case "key:issue": {
      const role = requiredOption("role");
      if (role !== "admin" && role !== "tenant") {
        throw new Error("--role must be admin or tenant.");
      }
      const result = await services.issueCredential.execute({
        role,
        tenantId: option("tenant-id"),
        name: requiredOption("name"),
        note: option("note"),
      });
      print({
        ...result,
        warning: "Store plaintextKey now. It cannot be recovered later.",
      });
      break;
    }
    case "key:list": {
      const role = option("role");
      if (role && role !== "admin" && role !== "tenant") {
        throw new Error("--role must be admin or tenant.");
      }
      const credentialRole = role as McpCredentialRole | undefined;
      print({
        credentials: await services.listCredentials.execute({
          role: credentialRole,
          tenantId: option("tenant-id"),
        }),
      });
      break;
    }
    case "key:revoke":
      if (!confirmed()) throw new Error("key:revoke requires --confirm.");
      print({
        credential: await services.revokeCredential.execute({
          credentialId: requiredOption("credential-id"),
        }),
      });
      break;
    case "key:migrate-env": {
      if (!confirmed()) throw new Error("key:migrate-env requires --confirm.");
      const tenantId = process.env.CMS_TENANT_ID;
      const plaintextKey = process.env.CMS_MCP_API_KEY;
      if (!tenantId || !plaintextKey) {
        throw new Error("CMS_TENANT_ID and CMS_MCP_API_KEY are required.");
      }
      print({
        result: await services.importLegacyCredential.execute({
          tenantId,
          plaintextKey,
          name: option("name") ?? "Migrated environment tenant key",
          note: "Imported from the M7 environment credential.",
        }),
      });
      break;
    }
    case "article:list":
      print({
        articles: await services.listArticles.execute({
          tenantId: requiredOption("tenant-id"),
        }),
      });
      break;
    case "article:get":
      print({
        article: await services.getArticle.execute({
          tenantId: requiredOption("tenant-id"),
          articleId: requiredOption("article-id"),
        }),
      });
      break;
    case "article:delete":
      if (!confirmed()) throw new Error("article:delete requires --confirm.");
      await services.deleteArticle.execute({
        tenantId: requiredOption("tenant-id"),
        articleId: requiredOption("article-id"),
      });
      print({ deleted: true, articleId: requiredOption("article-id") });
      break;
    default:
      throw new Error(
        "Unknown command. Use bootstrap-admin, tenant:list, tenant:create, tenant:set-status, key:issue, key:list, key:revoke, key:migrate-env, article:list, article:get, or article:delete.",
      );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "MCP command failed.");
  process.exitCode = 1;
} finally {
  await database.close();
}
