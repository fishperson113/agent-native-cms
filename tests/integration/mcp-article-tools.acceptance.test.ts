import { config } from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCmsMcpServer } from "@/integrations/mcp/create-cms-mcp-server";
import {
  ARTICLE_PRESENTATION_SDK_VERSION,
  CMS_AGENT_INSTRUCTIONS_VERSION,
  CMS_MCP_CONTRACT_VERSION,
  CMS_MCP_TOOL_NAMES,
} from "@/integrations/mcp/contract";
import type {
  CmsMcpObserver,
  CmsMcpTelemetryEvent,
} from "@/integrations/mcp/observability";
import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";
import {
  articlePresentations,
  articles,
  tenants,
} from "@/infrastructure/database/schema";
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
import { Tenant } from "@/modules/tenant/domain/tenant";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { tenantId } from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";
import { UuidGenerator } from "@/shared/kernel/ports/id-generator";
import { BasicSlugGenerator } from "@/shared/kernel/ports/slug-generator";

config({ path: ".env", quiet: true });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const tenantRepository = new DrizzleTenantRepository(database.db);
const articleRepository = new DrizzleArticleRepository(database.db);
const presentationRepository = new DrizzleArticlePresentationRepository(
  database.db,
);
const presentationLifecycle = new DrizzlePresentationLifecycleUnitOfWork(
  database.db,
);
const ownerId = tenantId("10000000-0000-4000-8000-000000000001");

class FixedClock implements Clock {
  now(): Date {
    return new Date("2026-08-27T00:00:00.000Z");
  }
}

const clock = new FixedClock();
const client = new Client({ name: "cms-mcp-acceptance", version: "1.0.0" });
let server: McpServer;
const telemetryEvents: CmsMcpTelemetryEvent[] = [];
const observer: CmsMcpObserver = {
  record(event) {
    telemetryEvents.push(event);
  },
};

function getStructuredContent(result: unknown): Record<string, unknown> {
  if (
    typeof result !== "object" ||
    result === null ||
    !("structuredContent" in result) ||
    typeof result.structuredContent !== "object" ||
    result.structuredContent === null
  ) {
    throw new Error("Expected an MCP tool result with structured content.");
  }

  return result.structuredContent as Record<string, unknown>;
}

beforeAll(async () => {
  server = createCmsMcpServer({
    tenantId: ownerId,
    observer,
    createArticle: new CreateArticleHandler(
      articleRepository,
      tenantRepository,
      new UuidGenerator(),
      new BasicSlugGenerator(),
      clock,
    ),
    deleteArticle: new DeleteArticleHandler(articleRepository),
    getArticle: new GetArticleHandler(articleRepository),
    getArticleBySlug: new GetArticleBySlugHandler(articleRepository),
    listArticles: new ListArticlesHandler(articleRepository),
    publishArticle: new PublishArticleHandler(articleRepository, clock),
    unpublishArticle: new UnpublishArticleHandler(articleRepository, clock),
    updateArticleContent: new UpdateArticleContentHandler(
      articleRepository,
      clock,
    ),
    updateArticleMetadata: new UpdateArticleMetadataHandler(
      articleRepository,
      clock,
    ),
    activateArticlePresentation: new ActivateArticlePresentationHandler(
      presentationLifecycle,
      clock,
    ),
    getArticlePresentation: new GetArticlePresentationHandler(
      presentationRepository,
    ),
    listArticlePresentations: new ListArticlePresentationsHandler(
      articleRepository,
      presentationRepository,
    ),
    resetArticlePresentation: new ResetArticlePresentationHandler(
      presentationLifecycle,
      clock,
    ),
    uploadArticlePresentation: new UploadArticlePresentationHandler(
      articleRepository,
      presentationRepository,
      new EsbuildPresentationCompiler(),
      new UuidGenerator(),
      clock,
    ),
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

beforeEach(async () => {
  telemetryEvents.length = 0;
  await database.db.delete(articlePresentations);
  await database.db.delete(articles);
  await database.db.delete(tenants);
  await tenantRepository.save(
    Tenant.create({
      id: ownerId,
      name: "MCP Workspace",
      slug: "mcp-workspace",
      now: clock.now(),
    }),
  );
});

afterAll(async () => {
  await client.close();
  await server.close();
  await database.close();
});

describe("MCP article tools", () => {
  it("advertises the coding-agent prompt and article tool contract", async () => {
    const tools = await client.listTools();
    const prompts = await client.listPrompts();
    const prompt = await client.getPrompt({
      name: "agent-native-cms-integration",
    });

    expect(tools.tools.map((tool) => tool.name)).toEqual(CMS_MCP_TOOL_NAMES);
    expect(
      tools.tools.find(
        (tool) => tool.name === "cms_upload_article_presentation",
      )?.inputSchema,
    ).toMatchObject({
      type: "object",
      required: ["articleId", "sourceCode"],
      properties: {
        articleId: { type: "string", format: "uuid" },
        sourceCode: { type: "string" },
      },
    });
    expect(
      tools.tools.find(
        (tool) => tool.name === "cms_activate_article_presentation",
      )?.inputSchema,
    ).toMatchObject({
      required: ["articleId", "presentationId"],
    });
    expect(prompts.prompts.map((item) => item.name)).toContain(
      "agent-native-cms-integration",
    );
    expect(JSON.stringify(prompt.messages)).toContain(
      "Do not edit or redeploy the hosted CMS kernel",
    );

    const instructions = getStructuredContent(
      await client.callTool({ name: "cms_get_instructions", arguments: {} }),
    );
    expect(instructions).toMatchObject({
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      instructionsVersion: CMS_AGENT_INSTRUCTIONS_VERSION,
      meta: { contractVersion: CMS_MCP_CONTRACT_VERSION },
    });
    expect(JSON.stringify(instructions)).toContain("Back to home");
    expect(JSON.stringify(instructions)).toContain("360px");
  });

  it("lets an external coding agent upload and manage Markdown without an LLM in the kernel", async () => {
    const createdResult = await client.callTool({
      name: "cms_create_article",
      arguments: {
        title: "Program uploaded by a coding agent",
        markdown: "# Agent-owned content",
      },
    });
    expect(createdResult.isError).not.toBe(true);
    const created = getStructuredContent(createdResult).article as {
      id: string;
      slug: string;
      status: string;
    };
    expect(created).toMatchObject({
      slug: "program-uploaded-by-a-coding-agent",
      status: "draft",
    });

    await client.callTool({
      name: "cms_update_article_content",
      arguments: {
        articleId: created.id,
        markdown: "# Updated programmatically",
      },
    });
    const publishedResult = await client.callTool({
      name: "cms_publish_article",
      arguments: { articleId: created.id },
    });
    const published = getStructuredContent(publishedResult).article as {
      markdown: string;
      status: string;
    };
    expect(published).toMatchObject({
      markdown: "# Updated programmatically",
      status: "published",
    });

    const listedResult = await client.callTool({
      name: "cms_list_articles",
      arguments: {},
    });
    const listed = getStructuredContent(listedResult).articles as unknown[];
    expect(listed).toHaveLength(1);

    const deletedResult = await client.callTool({
      name: "cms_delete_article",
      arguments: { articleId: created.id },
    });
    expect(getStructuredContent(deletedResult)).toMatchObject({
      deleted: true,
      articleId: created.id,
    });
  });

  it("runs the complete coding-agent presentation lifecycle through MCP", async () => {
    const sdkResult = await client.callTool({
      name: "cms_get_presentation_sdk",
      arguments: {},
    });
    expect(getStructuredContent(sdkResult)).toMatchObject({
      module: "@cms/article-sdk",
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      sdkVersion: ARTICLE_PRESENTATION_SDK_VERSION,
    });
    expect(JSON.stringify(getStructuredContent(sdkResult))).toContain(
      "ArticleRoot",
    );
    expect(getStructuredContent(sdkResult)).toMatchObject({
      experienceRulesVersion: "1.0.0",
      designRules: {
        requiredStructure: expect.arrayContaining([
          expect.stringContaining("ArticleRoot"),
          expect.stringContaining("Hero"),
        ]),
        responsive: expect.arrayContaining([
          expect.stringContaining("mobile first"),
        ]),
      },
    });

    const articleResult = await client.callTool({
      name: "cms_create_article",
      arguments: {
        title: "Presentation lifecycle",
        markdown: "# Sent through MCP",
      },
    });
    const article = getStructuredContent(articleResult).article as {
      id: string;
      activePresentationId?: string;
    };
    const firstSource = `
      import { ArticleRoot, Hero, Markdown } from "@cms/article-sdk";
      export default function Presentation({ article }) {
        return <ArticleRoot><Hero title={article.title} /><Markdown content={article.markdown} /></ArticleRoot>;
      }
    `;

    const firstUploadResult = await client.callTool({
      name: "cms_upload_article_presentation",
      arguments: { articleId: article.id, sourceCode: firstSource },
    });
    const firstUpload = getStructuredContent(firstUploadResult);
    const firstPresentation = firstUpload.presentation as {
      id: string;
      status: string;
    };
    expect(firstUpload).toMatchObject({
      activated: false,
      compileErrors: [],
    });
    expect(firstPresentation.status).toBe("compiled");

    const beforeActivation = await client.callTool({
      name: "cms_get_article",
      arguments: { articleId: article.id },
    });
    expect(
      (getStructuredContent(beforeActivation).article as {
        activePresentationId?: string;
      }).activePresentationId,
    ).toBeUndefined();

    const inspectedResult = await client.callTool({
      name: "cms_get_article_presentation",
      arguments: { presentationId: firstPresentation.id },
    });
    expect(getStructuredContent(inspectedResult)).toMatchObject({
      presentation: {
        id: firstPresentation.id,
        status: "compiled",
        sourceCode: expect.stringContaining("ArticleRoot"),
        hasCompiledArtifact: true,
      },
    });

    const activationResult = await client.callTool({
      name: "cms_activate_article_presentation",
      arguments: {
        articleId: article.id,
        presentationId: firstPresentation.id,
      },
    });
    expect(getStructuredContent(activationResult)).toMatchObject({
      activated: true,
      presentation: { id: firstPresentation.id, status: "active" },
    });

    const failedUploadResult = await client.callTool({
      name: "cms_upload_article_presentation",
      arguments: {
        articleId: article.id,
        sourceCode: "export default function Broken( {",
      },
    });
    expect(getStructuredContent(failedUploadResult)).toMatchObject({
      activated: false,
      presentation: { status: "failed" },
    });
    expect(
      (getStructuredContent(failedUploadResult).compileErrors as string[])
        .length,
    ).toBeGreaterThan(0);

    const guardrailUploadResult = await client.callTool({
      name: "cms_upload_article_presentation",
      arguments: {
        articleId: article.id,
        sourceCode:
          "export default function Presentation() { return <main>Unstructured article</main>; }",
      },
    });
    expect(getStructuredContent(guardrailUploadResult)).toMatchObject({
      activated: false,
      presentation: { status: "failed" },
      compileErrors: expect.arrayContaining([
        expect.stringContaining("ArticleRoot"),
        expect.stringContaining("Hero"),
      ]),
    });

    const secondUploadResult = await client.callTool({
      name: "cms_upload_article_presentation",
      arguments: {
        articleId: article.id,
        sourceCode: firstSource
          .replace("Markdown", "Card")
          .replace(
            "<Markdown content={article.markdown} />",
            "<Card>{article.markdown}</Card>",
          ),
      },
    });
    const secondPresentation = getStructuredContent(secondUploadResult)
      .presentation as { id: string; status: string };
    await client.callTool({
      name: "cms_activate_article_presentation",
      arguments: {
        articleId: article.id,
        presentationId: secondPresentation.id,
      },
    });

    const rollbackResult = await client.callTool({
      name: "cms_activate_article_presentation",
      arguments: {
        articleId: article.id,
        presentationId: firstPresentation.id,
      },
    });
    expect(getStructuredContent(rollbackResult)).toMatchObject({
      presentation: { id: firstPresentation.id, status: "active" },
    });

    const listedResult = await client.callTool({
      name: "cms_list_article_presentations",
      arguments: { articleId: article.id },
    });
    const listed = getStructuredContent(listedResult)
      .presentations as Array<{ status: string }>;
    expect(listed).toHaveLength(4);
    expect(listed.filter((item) => item.status === "active")).toHaveLength(1);
    expect(listed.filter((item) => item.status === "failed")).toHaveLength(2);

    const resetResult = await client.callTool({
      name: "cms_reset_article_presentation",
      arguments: { articleId: article.id },
    });
    expect(getStructuredContent(resetResult)).toMatchObject({
      reset: true,
      article: { id: article.id },
    });
    expect(
      (getStructuredContent(resetResult).article as {
        activePresentationId?: string;
      }).activePresentationId,
    ).toBeUndefined();
  });

  it("returns a safe typed tool error for missing content", async () => {
    const result = await client.callTool({
      name: "cms_get_article",
      arguments: { articleId: "20000000-0000-4000-8000-000000000001" },
    });

    expect(result.isError).toBe(true);
    expect(getStructuredContent(result)).toMatchObject({
      error: {
        code: "ARTICLE_NOT_FOUND",
        message: "Article not found.",
      },
      meta: {
        contractVersion: CMS_MCP_CONTRACT_VERSION,
      },
    });
  });

  it("emits correlated metadata without logging source or credentials", async () => {
    const articleResult = await client.callTool({
      name: "cms_create_article",
      arguments: {
        title: "Observable upload",
        markdown: "SECRET_MARKDOWN_MUST_NOT_BE_LOGGED",
      },
    });
    const article = getStructuredContent(articleResult).article as { id: string };
    const sourceCode = `
      import { ArticleRoot, Hero } from "@cms/article-sdk";
      // SECRET_SOURCE_MUST_NOT_BE_LOGGED
      export default function Presentation({ article }) { return <ArticleRoot><Hero title={article.title} />Safe</ArticleRoot>; }
    `;
    const uploadResult = await client.callTool({
      name: "cms_upload_article_presentation",
      arguments: { articleId: article.id, sourceCode },
    });
    const upload = getStructuredContent(uploadResult);
    const presentation = upload.presentation as { id: string };
    const uploadEvent = telemetryEvents.find(
      (event) => event.toolName === "cms_upload_article_presentation",
    );

    expect(uploadEvent).toMatchObject({
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      tenantId: ownerId,
      articleId: article.id,
      presentationId: presentation.id,
      resultState: "compiled",
    });
    expect(uploadEvent?.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(uploadEvent?.compileDurationMs).toBeGreaterThanOrEqual(0);
    expect(uploadEvent?.artifactHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(telemetryEvents)).not.toContain(
      "SECRET_SOURCE_MUST_NOT_BE_LOGGED",
    );
    expect(JSON.stringify(telemetryEvents)).not.toContain(
      "SECRET_MARKDOWN_MUST_NOT_BE_LOGGED",
    );
    expect(JSON.stringify(telemetryEvents)).not.toContain(
      environment.DATABASE_URL,
    );
    expect(upload.meta).toMatchObject({
      contractVersion: CMS_MCP_CONTRACT_VERSION,
      correlationId: uploadEvent?.correlationId,
    });
  });
});
