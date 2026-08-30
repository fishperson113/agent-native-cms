import { createHash } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";

import type { AuditEventSink } from "@/modules/audit/audit-event";
import type { CreateArticleHandler } from "@/modules/content/application/create-article/create-article.handler";
import type { DeleteArticleHandler } from "@/modules/content/application/delete-article/delete-article.handler";
import type { GetArticleBySlugHandler } from "@/modules/content/application/get-article-by-slug/get-article-by-slug.handler";
import type { GetArticleHandler } from "@/modules/content/application/get-article/get-article.handler";
import type { ListArticlesHandler } from "@/modules/content/application/list-articles/list-articles.handler";
import type { PublishArticleHandler } from "@/modules/content/application/publish-article/publish-article.handler";
import type { UnpublishArticleHandler } from "@/modules/content/application/unpublish-article/unpublish-article.handler";
import type { UpdateArticleContentHandler } from "@/modules/content/application/update-article-content/update-article-content.handler";
import type { UpdateArticleMetadataHandler } from "@/modules/content/application/update-article-metadata/update-article-metadata.handler";
import type { ActivateArticlePresentationHandler } from "@/modules/presentation/application/activate-article-presentation/activate-article-presentation.handler";
import type { ArticlePresentationDto } from "@/modules/presentation/application/article-presentation.dto";
import type { GetArticlePresentationHandler } from "@/modules/presentation/application/get-article-presentation/get-article-presentation.handler";
import type { ListArticlePresentationsHandler } from "@/modules/presentation/application/list-article-presentations/list-article-presentations.handler";
import type { ResetArticlePresentationHandler } from "@/modules/presentation/application/reset-article-presentation/reset-article-presentation.handler";
import type { UploadArticlePresentationHandler } from "@/modules/presentation/application/upload-article-presentation/upload-article-presentation.handler";
import { ARTICLE_PRESENTATION_SDK_CONTRACT } from "@/modules/runtime/application/article-presentation-sdk-contract";
import {
  ARTICLE_EXPERIENCE_AGENT_RULES,
  ARTICLE_EXPERIENCE_DESIGN_RULES,
  ARTICLE_EXPERIENCE_RULES_VERSION,
} from "@/modules/runtime/application/article-experience-design-rules";

import { AGENT_INTEGRATION_INSTRUCTIONS } from "./agent-instructions";
import {
  ARTICLE_PRESENTATION_SDK_VERSION,
  CMS_AGENT_INSTRUCTIONS_VERSION,
  CMS_MCP_CONTRACT_VERSION,
  type CmsMcpToolName,
} from "./contract";
import {
  generateCorrelationId,
  NoopCmsMcpObserver,
  type CmsMcpObserver,
} from "./observability";

export type CmsMcpDependencies = {
  tenantId: string;
  credentialId?: string;
  getSessionId?: () => string | undefined;
  audit?: AuditEventSink;
  createArticle: CreateArticleHandler;
  deleteArticle: DeleteArticleHandler;
  getArticle: GetArticleHandler;
  getArticleBySlug: GetArticleBySlugHandler;
  listArticles: ListArticlesHandler;
  publishArticle: PublishArticleHandler;
  unpublishArticle: UnpublishArticleHandler;
  updateArticleContent: UpdateArticleContentHandler;
  updateArticleMetadata: UpdateArticleMetadataHandler;
  activateArticlePresentation: ActivateArticlePresentationHandler;
  getArticlePresentation: GetArticlePresentationHandler;
  listArticlePresentations: ListArticlePresentationsHandler;
  resetArticlePresentation: ResetArticlePresentationHandler;
  uploadArticlePresentation: UploadArticlePresentationHandler;
  observer?: CmsMcpObserver;
  generateCorrelationId?: () => string;
  getTime?: () => number;
};

type ToolIdentifiers = {
  articleId?: string;
  presentationId?: string;
};

type ToolTelemetry = {
  artifactHash?: string;
  presentationId?: string;
  resultState?: string;
};

type ToolActionResult = Record<string, unknown> & {
  __telemetry?: ToolTelemetry;
};

const PRESENTATION_EXAMPLE = `import { ArticleRoot, Hero, Section, Markdown } from "@cms/article-sdk";

export default function Presentation({ article }) {
  return (
    <ArticleRoot style={{ background: "#f4f2eb", color: "#191916" }}>
      <Hero
        title={article.title}
        subtitle="A concise article introduction."
        style={{ maxWidth: 1280, margin: "0 auto" }}
      />
      <Section style={{ maxWidth: 760, margin: "0 auto" }}>
        <Markdown content={article.markdown} />
      </Section>
    </ArticleRoot>
  );
}`;

function presentationSummary(
  presentation: ArticlePresentationDto,
): Record<string, unknown> {
  return {
    id: presentation.id,
    articleId: presentation.articleId,
    status: presentation.status,
    failureReason: presentation.failureReason,
    createdAt: presentation.createdAt,
    updatedAt: presentation.updatedAt,
  };
}

function success(
  value: Record<string, unknown>,
  correlationId: string,
): CallToolResult {
  const result = {
    ...value,
    meta: {
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      correlationId,
    },
  };
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}

function errorDetails(error: unknown): { code: string; message: string } {
  const typed =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const isKnownError = typeof typed.code === "string";
  return {
    code: isKnownError ? typed.code as string : "UNEXPECTED_ERROR",
    message:
      isKnownError && typeof typed.message === "string"
        ? typed.message
        : "The CMS tool could not complete the operation.",
  };
}

function failure(error: unknown, correlationId: string): CallToolResult {
  const value = {
    error: errorDetails(error),
    meta: {
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      correlationId,
    },
  };

  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

async function execute(
  dependencies: CmsMcpDependencies,
  toolName: CmsMcpToolName,
  identifiers: ToolIdentifiers,
  action: () => Promise<ToolActionResult>,
): Promise<CallToolResult> {
  const observer = dependencies.observer ?? new NoopCmsMcpObserver();
  const correlationId = (
    dependencies.generateCorrelationId ?? generateCorrelationId
  )();
  const getTime = dependencies.getTime ?? Date.now;
  const startedAt = getTime();
  const resourceType = identifiers.presentationId
    ? "article_presentation"
    : identifiers.articleId
      ? "article"
      : "mcp_tool";
  const resourceId =
    identifiers.presentationId ?? identifiers.articleId ?? toolName;
  await dependencies.audit?.append({
    eventType: "mcp.tool.started.v1",
    actorRole: "tenant",
    credentialId: dependencies.credentialId,
    tenantId: dependencies.tenantId,
    sessionId: dependencies.getSessionId?.(),
    correlationId,
    resourceType,
    resourceId,
    outcome: "success",
    metadata: { toolName },
  });
  try {
    const { __telemetry: telemetry, ...value } = await action();
    const durationMs = Math.max(0, getTime() - startedAt);
    observer.record({
      event: "cms_mcp_tool_call",
      correlationId,
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      toolName,
      tenantId: dependencies.tenantId,
      ...identifiers,
      presentationId:
        telemetry?.presentationId ?? identifiers.presentationId,
      durationMs,
      compileDurationMs:
        toolName === "cms_upload_article_presentation"
          ? durationMs
          : undefined,
      resultState: telemetry?.resultState ?? "succeeded",
      artifactHash: telemetry?.artifactHash,
    });
    await dependencies.audit?.append({
      eventType: "mcp.tool.completed.v1",
      actorRole: "tenant",
      credentialId: dependencies.credentialId,
      tenantId: dependencies.tenantId,
      sessionId: dependencies.getSessionId?.(),
      correlationId,
      resourceType,
      resourceId,
      outcome: "success",
      durationMs,
      metadata: {
        toolName,
        resultState: telemetry?.resultState ?? "succeeded",
        ...(telemetry?.artifactHash
          ? { artifactHash: telemetry.artifactHash }
          : {}),
      },
    });
    return success(value, correlationId);
  } catch (error) {
    const details = errorDetails(error);
    const denied =
      details.code.endsWith("_NOT_FOUND") ||
      details.code === "TENANT_DISABLED" ||
      details.code === "PRESENTATION_ARTICLE_MISMATCH";
    observer.record({
      event: "cms_mcp_tool_call",
      correlationId,
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      toolName,
      tenantId: dependencies.tenantId,
      ...identifiers,
      durationMs: Math.max(0, getTime() - startedAt),
      resultState: "error",
      errorCode: details.code,
    });
    await dependencies.audit?.append({
      eventType: denied ? "mcp.tool.denied.v1" : "mcp.tool.failed.v1",
      actorRole: "tenant",
      credentialId: dependencies.credentialId,
      tenantId: dependencies.tenantId,
      sessionId: dependencies.getSessionId?.(),
      correlationId,
      resourceType,
      resourceId,
      outcome: denied ? "denied" : "failed",
      durationMs: Math.max(0, getTime() - startedAt),
      metadata: { toolName, errorCode: details.code },
    });
    return failure(error, correlationId);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createCmsMcpServer(
  dependencies: CmsMcpDependencies,
): McpServer {
  const server = new McpServer({
    name: "agent-native-cms",
    version: CMS_MCP_CONTRACT_VERSION,
  });

  server.registerPrompt(
    "agent-native-cms-integration",
    {
      title: "Integrate Agent-Native CMS",
      description:
        "Instructions for a coding agent to manage the hosted CMS kernel through MCP.",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: AGENT_INTEGRATION_INSTRUCTIONS },
        },
      ],
    }),
  );

  server.registerTool(
    "cms_get_instructions",
    {
      title: "Get CMS integration instructions",
      description:
        "Returns the copyable instructions and workflow for coding agents.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      execute(dependencies, "cms_get_instructions", {}, async () => ({
        contractVersion: CMS_MCP_CONTRACT_VERSION,
        instructionsVersion: CMS_AGENT_INSTRUCTIONS_VERSION,
        instructions: AGENT_INTEGRATION_INSTRUCTIONS,
      })),
  );

  server.registerTool(
    "cms_create_article",
    {
      title: "Create article",
      description:
        "Uploads a new Markdown article to the hosted CMS kernel as a draft.",
      inputSchema: {
        title: z.string().describe("Article title"),
        slug: z.string().optional().describe("Optional URL slug"),
        markdown: z.string().optional().describe("Markdown article body"),
      },
    },
    async (input) =>
      execute(dependencies, "cms_create_article", {}, async () => ({
        article: await dependencies.createArticle.execute({
          tenantId: dependencies.tenantId,
          ...input,
        }),
      })),
  );

  server.registerTool(
    "cms_list_articles",
    {
      title: "List articles",
      description: "Lists articles in the configured CMS tenant.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      execute(dependencies, "cms_list_articles", {}, async () => ({
        articles: await dependencies.listArticles.execute({
          tenantId: dependencies.tenantId,
        }),
      })),
  );

  server.registerTool(
    "cms_get_article",
    {
      title: "Get article",
      description: "Gets one article by its CMS article ID.",
      inputSchema: { articleId: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ articleId }) =>
      execute(dependencies, "cms_get_article", { articleId }, async () => ({
        article: await dependencies.getArticle.execute({
          tenantId: dependencies.tenantId,
          articleId,
        }),
      })),
  );

  server.registerTool(
    "cms_get_article_by_slug",
    {
      title: "Get article by slug",
      description: "Gets one article by its tenant-scoped slug.",
      inputSchema: { slug: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) =>
      execute(dependencies, "cms_get_article_by_slug", {}, async () => ({
        article: await dependencies.getArticleBySlug.execute({
          tenantId: dependencies.tenantId,
          slug,
        }),
      })),
  );

  server.registerTool(
    "cms_update_article_content",
    {
      title: "Update article content",
      description: "Replaces the Markdown body of one article.",
      inputSchema: {
        articleId: z.string().uuid(),
        markdown: z.string(),
      },
    },
    async ({ articleId, markdown }) =>
      execute(
        dependencies,
        "cms_update_article_content",
        { articleId },
        async () => ({
        article: await dependencies.updateArticleContent.execute({
          tenantId: dependencies.tenantId,
          articleId,
          markdown,
        }),
        }),
      ),
  );

  server.registerTool(
    "cms_update_article_metadata",
    {
      title: "Update article metadata",
      description: "Changes the title and/or slug of one article.",
      inputSchema: {
        articleId: z.string().uuid(),
        title: z.string().optional(),
        slug: z.string().optional(),
      },
    },
    async ({ articleId, title, slug }) =>
      execute(
        dependencies,
        "cms_update_article_metadata",
        { articleId },
        async () => ({
        article: await dependencies.updateArticleMetadata.execute({
          tenantId: dependencies.tenantId,
          articleId,
          title,
          slug,
        }),
        }),
      ),
  );

  server.registerTool(
    "cms_publish_article",
    {
      title: "Publish article",
      description: "Publishes a CMS article.",
      inputSchema: { articleId: z.string().uuid() },
    },
    async ({ articleId }) =>
      execute(dependencies, "cms_publish_article", { articleId }, async () => ({
        article: await dependencies.publishArticle.execute({
          tenantId: dependencies.tenantId,
          articleId,
        }),
      })),
  );

  server.registerTool(
    "cms_unpublish_article",
    {
      title: "Unpublish article",
      description: "Returns a published article to draft state.",
      inputSchema: { articleId: z.string().uuid() },
    },
    async ({ articleId }) =>
      execute(dependencies, "cms_unpublish_article", { articleId }, async () => ({
        article: await dependencies.unpublishArticle.execute({
          tenantId: dependencies.tenantId,
          articleId,
        }),
      })),
  );

  server.registerTool(
    "cms_delete_article",
    {
      title: "Delete article",
      description: "Deletes one CMS article.",
      inputSchema: { articleId: z.string().uuid() },
      annotations: { destructiveHint: true },
    },
    async ({ articleId }) =>
      execute(dependencies, "cms_delete_article", { articleId }, async () => {
        await dependencies.deleteArticle.execute({
          tenantId: dependencies.tenantId,
          articleId,
        });
        return { deleted: true, articleId };
      }),
  );

  server.registerTool(
    "cms_get_presentation_sdk",
    {
      title: "Get presentation SDK",
      description:
        "Returns the current @cms/article-sdk contract, mandatory article UX rules, responsive primitives, and a minimal TSX program.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      execute(dependencies, "cms_get_presentation_sdk", {}, async () => ({
        contractVersion: CMS_MCP_CONTRACT_VERSION,
        sdkVersion: ARTICLE_PRESENTATION_SDK_VERSION,
        experienceRulesVersion: ARTICLE_EXPERIENCE_RULES_VERSION,
        module: "@cms/article-sdk",
        contract: ARTICLE_PRESENTATION_SDK_CONTRACT,
        designRules: ARTICLE_EXPERIENCE_DESIGN_RULES,
        agentRules: ARTICLE_EXPERIENCE_AGENT_RULES,
        example: PRESENTATION_EXAMPLE,
        workflow: [
          "Upload source with cms_upload_article_presentation.",
          "Fix and upload a new version when compilation fails.",
          "Activate only a compiled presentation.",
        ],
      })),
  );

  server.registerTool(
    "cms_upload_article_presentation",
    {
      title: "Upload article presentation",
      description:
        "Uploads and compiles a new TSX presentation version without activating it.",
      inputSchema: {
        articleId: z.string().uuid(),
        sourceCode: z.string().min(1).describe("Complete TSX source program"),
      },
    },
    async ({ articleId, sourceCode }) =>
      execute(
        dependencies,
        "cms_upload_article_presentation",
        { articleId },
        async () => {
        const result = await dependencies.uploadArticlePresentation.execute({
          tenantId: dependencies.tenantId,
          articleId,
          sourceCode,
        });
        const artifactHash = result.presentation.compiledCode
          ? sha256(result.presentation.compiledCode)
          : undefined;
        return {
          presentation: presentationSummary(result.presentation),
          warnings: result.warnings,
          compileErrors: result.compileErrors,
          activated: false,
          artifactHash,
          __telemetry: {
            artifactHash,
            presentationId: result.presentation.id,
            resultState: result.presentation.status,
          },
        };
        },
      ),
  );

  server.registerTool(
    "cms_get_article_presentation",
    {
      title: "Get article presentation",
      description:
        "Gets one tenant-scoped presentation version, including its uploaded TSX source.",
      inputSchema: { presentationId: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ presentationId }) =>
      execute(
        dependencies,
        "cms_get_article_presentation",
        { presentationId },
        async () => {
        const presentation = await dependencies.getArticlePresentation.execute({
          tenantId: dependencies.tenantId,
          presentationId,
        });
        return {
          presentation: {
            ...presentationSummary(presentation),
            sourceCode: presentation.sourceCode,
            hasCompiledArtifact: Boolean(presentation.compiledCode),
          },
        };
        },
      ),
  );

  server.registerTool(
    "cms_list_article_presentations",
    {
      title: "List article presentations",
      description:
        "Lists presentation versions and compilation states for one article.",
      inputSchema: { articleId: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ articleId }) =>
      execute(
        dependencies,
        "cms_list_article_presentations",
        { articleId },
        async () => ({
        presentations: (
          await dependencies.listArticlePresentations.execute({
            tenantId: dependencies.tenantId,
            articleId,
          })
        ).map(presentationSummary),
        }),
      ),
  );

  server.registerTool(
    "cms_activate_article_presentation",
    {
      title: "Activate article presentation",
      description:
        "Atomically activates a compiled presentation version for an article without rebuilding or restarting the kernel.",
      inputSchema: {
        articleId: z.string().uuid(),
        presentationId: z.string().uuid(),
      },
    },
    async ({ articleId, presentationId }) =>
      execute(
        dependencies,
        "cms_activate_article_presentation",
        { articleId, presentationId },
        async () => ({
        presentation: presentationSummary(
          await dependencies.activateArticlePresentation.execute({
            tenantId: dependencies.tenantId,
            articleId,
            presentationId,
          }),
        ),
        activated: true,
        }),
      ),
  );

  server.registerTool(
    "cms_reset_article_presentation",
    {
      title: "Reset article presentation",
      description:
        "Atomically detaches the active presentation so the article returns to its default presentation.",
      inputSchema: { articleId: z.string().uuid() },
    },
    async ({ articleId }) =>
      execute(
        dependencies,
        "cms_reset_article_presentation",
        { articleId },
        async () => ({
        article: await dependencies.resetArticlePresentation.execute({
          tenantId: dependencies.tenantId,
          articleId,
        }),
        reset: true,
        }),
      ),
  );

  return server;
}
