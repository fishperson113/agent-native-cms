import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Database } from "@/infrastructure/database/client";
import { createCmsMcpServer } from "@/integrations/mcp/create-cms-mcp-server";
import type { CmsMcpObserver } from "@/integrations/mcp/observability";
import type { AuditEventSink } from "@/modules/audit/audit-event";
import { CreateArticleHandler } from "@/modules/content/application/create-article/create-article.handler";
import { DeleteArticleHandler } from "@/modules/content/application/delete-article/delete-article.handler";
import { GetArticleBySlugHandler } from "@/modules/content/application/get-article-by-slug/get-article-by-slug.handler";
import { GetArticleHandler } from "@/modules/content/application/get-article/get-article.handler";
import { ListArticlesHandler } from "@/modules/content/application/list-articles/list-articles.handler";
import { PublishArticleHandler } from "@/modules/content/application/publish-article/publish-article.handler";
import { UnpublishArticleHandler } from "@/modules/content/application/unpublish-article/unpublish-article.handler";
import { UpdateArticleContentHandler } from "@/modules/content/application/update-article-content/update-article-content.handler";
import { UpdateArticleMetadataHandler } from "@/modules/content/application/update-article-metadata/update-article-metadata.handler";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { ActivateArticlePresentationHandler } from "@/modules/presentation/application/activate-article-presentation/activate-article-presentation.handler";
import { GetArticlePresentationHandler } from "@/modules/presentation/application/get-article-presentation/get-article-presentation.handler";
import { ListArticlePresentationsHandler } from "@/modules/presentation/application/list-article-presentations/list-article-presentations.handler";
import { ResetArticlePresentationHandler } from "@/modules/presentation/application/reset-article-presentation/reset-article-presentation.handler";
import { UploadArticlePresentationHandler } from "@/modules/presentation/application/upload-article-presentation/upload-article-presentation.handler";
import { EsbuildPresentationCompiler } from "@/modules/presentation/infrastructure/compiler/esbuild-presentation-compiler";
import { DrizzleArticlePresentationRepository } from "@/modules/presentation/infrastructure/persistence/drizzle-article-presentation.repository";
import { DrizzlePresentationLifecycleUnitOfWork } from "@/modules/presentation/infrastructure/persistence/drizzle-presentation-lifecycle-unit-of-work";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { SystemClock } from "@/shared/kernel/ports/clock";
import { UuidGenerator } from "@/shared/kernel/ports/id-generator";
import { BasicSlugGenerator } from "@/shared/kernel/ports/slug-generator";

export function createCmsMcpKernel(input: {
  db: Database;
  tenantId: string;
  credentialId?: string;
  getSessionId?: () => string | undefined;
  audit?: AuditEventSink;
  observer?: CmsMcpObserver;
}): McpServer {
  const tenants = new DrizzleTenantRepository(input.db);
  const articles = new DrizzleArticleRepository(input.db);
  const presentations = new DrizzleArticlePresentationRepository(input.db);
  const lifecycle = new DrizzlePresentationLifecycleUnitOfWork(input.db);
  const clock = new SystemClock();

  return createCmsMcpServer({
    tenantId: input.tenantId,
    credentialId: input.credentialId,
    getSessionId: input.getSessionId,
    audit: input.audit,
    observer: input.observer,
    createArticle: new CreateArticleHandler(
      articles,
      tenants,
      new UuidGenerator(),
      new BasicSlugGenerator(),
      clock,
    ),
    deleteArticle: new DeleteArticleHandler(articles),
    getArticle: new GetArticleHandler(articles),
    getArticleBySlug: new GetArticleBySlugHandler(articles),
    listArticles: new ListArticlesHandler(articles),
    publishArticle: new PublishArticleHandler(articles, clock),
    unpublishArticle: new UnpublishArticleHandler(articles, clock),
    updateArticleContent: new UpdateArticleContentHandler(articles, clock),
    updateArticleMetadata: new UpdateArticleMetadataHandler(articles, clock),
    activateArticlePresentation: new ActivateArticlePresentationHandler(
      lifecycle,
      clock,
    ),
    getArticlePresentation: new GetArticlePresentationHandler(presentations),
    listArticlePresentations: new ListArticlePresentationsHandler(
      articles,
      presentations,
    ),
    resetArticlePresentation: new ResetArticlePresentationHandler(
      lifecycle,
      clock,
    ),
    uploadArticlePresentation: new UploadArticlePresentationHandler(
      articles,
      presentations,
      new EsbuildPresentationCompiler(),
      new UuidGenerator(),
      clock,
    ),
  });
}
