import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DELETE, POST } from "@/app/api/mcp/route";
import { GET as GET_HEALTH } from "@/app/api/mcp/health/route";
import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { createDatabase } from "@/infrastructure/database/client";
import { DrizzleAuditEventStore } from "@/modules/audit/drizzle-audit-event-store";
import { ArticleSlug } from "@/modules/content/domain/article-slug";
import { DrizzleArticleRepository } from "@/modules/content/infrastructure/persistence/drizzle-article.repository";
import { DrizzleTenantRepository } from "@/modules/tenant/infrastructure/persistence/drizzle-tenant.repository";
import { Tenant } from "@/modules/tenant/domain/tenant";
import { tenantId } from "@/shared/kernel/identifiers";

config({ path: ".env", quiet: true });

const apiKey = `cms_tenant_${randomUUID()}`;
const database = createDatabase(process.env.DATABASE_URL!);
const access = createMcpAccessServices(database.db);
const tenantRepository = new DrizzleTenantRepository(database.db);
const articleRepository = new DrizzleArticleRepository(database.db);
const auditStore = new DrizzleAuditEventStore(database.db);

beforeAll(async () => {
  const ownerId = tenantId("10000000-0000-4000-8000-000000000001");
  await tenantRepository.save(
    Tenant.create({
      id: ownerId,
      name: "HTTP Default Tenant",
      slug: "http-default-tenant",
      now: new Date(),
    }),
  );
  await access.issueCredential.execute({
    role: "tenant",
    tenantId: ownerId,
    name: "HTTP suite tenant",
    plaintextKey: apiKey,
  });
});

afterAll(async () => {
  await database.close();
});

function initializeRequest(authorization?: string) {
  const headers = new Headers({
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  });
  if (authorization) headers.set("Authorization", authorization);
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "m6-acceptance", version: "1.0.0" },
      },
    }),
  });
}

function sessionRequest(
  sessionId: string,
  method: "POST" | "DELETE",
  body?: unknown,
  bearerKey = apiKey,
) {
  return new Request("http://localhost/api/mcp", {
    method,
    headers: {
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${bearerKey}`,
      "Content-Type": "application/json",
      "MCP-Session-Id": sessionId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("hosted Streamable HTTP MCP", () => {
  it("rejects requests without the configured bearer key", async () => {
    const response = await POST(initializeRequest());
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("negotiates MCP over an authenticated JSON response", async () => {
    const response = await POST(initializeRequest(`Bearer ${apiKey}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const payload = (await response.json()) as {
      result: { protocolVersion: string; serverInfo: { name: string } };
    };
    expect(payload.result.protocolVersion).toBeTruthy();
    expect(payload.result.serverInfo.name).toContain("cms");
    const sessionId = response.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();

    const toolsResponse = await POST(
      sessionRequest(sessionId!, "POST", {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    );
    expect(toolsResponse.status).toBe(200);
    const tools = (await toolsResponse.json()) as {
      result: { tools: Array<{ name: string }> };
    };
    expect(tools.result.tools.map((tool) => tool.name)).toContain(
      "cms_create_article",
    );

    const closed = await DELETE(sessionRequest(sessionId!, "DELETE"));
    expect(closed.status).toBe(200);
    const afterClose = await POST(
      sessionRequest(sessionId!, "POST", {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/list",
        params: {},
      }),
    );
    expect(afterClose.status).toBe(404);
  });

  it("requires initialization before a sessionless tool call", async () => {
    const response = await POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects admin credentials from the MCP transport", async () => {
    const issued = await access.issueCredential.execute({
      role: "admin",
      name: "REST operator only",
    });
    const response = await POST(
      initializeRequest(`Bearer ${issued.plaintextKey}`),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("admin REST API"),
    });
  });

  it("protects runtime health and reports database/session readiness", async () => {
    const unauthorized = await GET_HEALTH(
      new Request("http://localhost/api/mcp/health"),
    );
    expect(unauthorized.status).toBe(401);

    const response = await GET_HEALTH(
      new Request("http://localhost/api/mcp/health", {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      database: "ready",
      maxSessions: 100,
    });
  });

  it("authenticates a database tenant key and closes its session after revoke", async () => {
    const ownerId = tenantId("10000000-0000-4000-8000-000000000089");
    await tenantRepository.save(
      Tenant.create({
        id: ownerId,
        name: "HTTP Credential Tenant",
        slug: "http-credential-tenant",
        now: new Date(),
      }),
    );
    const issued = await access.issueCredential.execute({
      role: "tenant",
      tenantId: ownerId,
      name: "HTTP acceptance agent",
    });
    const scopedSlug = `database-credential-scope-${randomUUID().slice(0, 8)}`;
    const initialized = await POST(
      initializeRequest(`Bearer ${issued.plaintextKey}`),
    );
    expect(initialized.status).toBe(200);
    const sessionId = initialized.headers.get("mcp-session-id")!;

    const created = await POST(
      sessionRequest(
        sessionId,
        "POST",
        {
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "cms_create_article",
            arguments: {
              title: "Database credential scope",
              slug: scopedSlug,
            },
          },
        },
        issued.plaintextKey,
      ),
    );
    expect(created.status).toBe(200);
    expect(
      await articleRepository.findBySlug(
        ownerId,
        ArticleSlug.create(scopedSlug),
      ),
    ).not.toBeNull();
    expect(
      await articleRepository.findBySlug(
        tenantId("10000000-0000-4000-8000-000000000001"),
        ArticleSlug.create(scopedSlug),
      ),
    ).toBeNull();
    const toolEvents = await auditStore.list({
      tenantId: ownerId,
      after: new Date(Date.now() - 30_000),
      limit: 50,
    });
    const started = toolEvents.find(
      (event) =>
        event.eventType === "mcp.tool.started.v1" &&
        event.metadata.toolName === "cms_create_article",
    );
    const completed = toolEvents.find(
      (event) =>
        event.eventType === "mcp.tool.completed.v1" &&
        event.correlationId === started?.correlationId,
    );
    expect(started).toBeDefined();
    expect(completed).toBeDefined();

    await access.revokeCredential.execute({
      credentialId: issued.credential.id,
    });
    const revoked = await POST(
      sessionRequest(
        sessionId,
        "POST",
        { jsonrpc: "2.0", id: 9, method: "tools/list", params: {} },
        issued.plaintextKey,
      ),
    );
    expect(revoked.status).toBe(401);

    const closed = await POST(
      sessionRequest(sessionId, "POST", {
        jsonrpc: "2.0",
        id: 10,
        method: "tools/list",
        params: {},
      }),
    );
    expect(closed.status).toBe(404);
  });
});
