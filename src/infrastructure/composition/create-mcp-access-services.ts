import type { DatabaseExecutor } from "@/infrastructure/database/client";
import { AuthenticateMcpCredentialHandler } from "@/modules/access/application/authenticate-mcp-credential.handler";
import { BootstrapAdminCredentialHandler } from "@/modules/access/application/bootstrap-admin-credential.handler";
import { ImportLegacyMcpCredentialHandler } from "@/modules/access/application/import-legacy-mcp-credential.handler";
import { IssueMcpCredentialHandler } from "@/modules/access/application/issue-mcp-credential.handler";
import { ListMcpCredentialsHandler } from "@/modules/access/application/list-mcp-credentials.handler";
import { RevokeMcpCredentialHandler } from "@/modules/access/application/revoke-mcp-credential.handler";
import { DrizzleMcpCredentialRepository } from "@/modules/access/infrastructure/persistence/drizzle-mcp-credential.repository";
import { SecureMcpKeyService } from "@/modules/access/infrastructure/security/secure-mcp-key-service";
import { DeleteArticleHandler } from "@/modules/content/application/delete-article/delete-article.handler";
import { GetArticleHandler } from "@/modules/content/application/get-article/get-article.handler";
import { ListArticlesHandler } from "@/modules/content/application/list-articles/list-articles.handler";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { CreateTenantHandler } from "@/modules/tenant/application/create-tenant.handler";
import { ListTenantsHandler } from "@/modules/tenant/application/list-tenants.handler";
import { SetTenantStatusHandler } from "@/modules/tenant/application/set-tenant-status.handler";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { SystemClock } from "@/shared/kernel/ports/clock";
import { UuidGenerator } from "@/shared/kernel/ports/id-generator";

export function createMcpAccessServices(db: DatabaseExecutor) {
  const credentials = new DrizzleMcpCredentialRepository(db);
  const tenants = new DrizzleTenantRepository(db);
  const articles = new DrizzleArticleRepository(db);
  const keys = new SecureMcpKeyService();
  const ids = new UuidGenerator();
  const clock = new SystemClock();
  const issueCredential = new IssueMcpCredentialHandler(
    credentials,
    tenants,
    keys,
    ids,
    clock,
  );

  return {
    authenticateCredential: new AuthenticateMcpCredentialHandler(
      credentials,
      tenants,
      keys,
    ),
    deleteArticle: new DeleteArticleHandler(articles),
    getArticle: new GetArticleHandler(articles),
    listArticles: new ListArticlesHandler(articles),
    bootstrapAdminCredential: new BootstrapAdminCredentialHandler(
      credentials,
      issueCredential,
    ),
    createTenant: new CreateTenantHandler(tenants, ids, clock),
    importLegacyCredential: new ImportLegacyMcpCredentialHandler(
      credentials,
      keys,
      issueCredential,
    ),
    issueCredential,
    listCredentials: new ListMcpCredentialsHandler(credentials),
    listTenants: new ListTenantsHandler(tenants),
    revokeCredential: new RevokeMcpCredentialHandler(credentials, clock),
    setTenantStatus: new SetTenantStatusHandler(tenants, clock),
  };
}
