import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it } from "vitest";

import { StatefulMcpSessionManager } from "./stateful-http-session-manager";

const managers: StatefulMcpSessionManager[] = [];
const credentialA = {
  authenticationId: "credential-a",
  tenantId: "tenant-a",
};

function createManager(input?: {
  getTime?: () => number;
  maxSessions?: number;
}) {
  let sequence = 0;
  const manager = new StatefulMcpSessionManager({
    cleanupIntervalMs: 0,
    idleTimeoutMs: 30_000,
    maxSessions: input?.maxSessions ?? 2,
    getTime: input?.getTime,
    generateSessionId: () => `session-${++sequence}`,
    createServer: () => {
      const server = new McpServer({
        name: "stateful-test",
        version: "1.0.0",
      });
      server.registerTool("ping", { description: "Test tool" }, async () => ({
        content: [{ type: "text", text: "pong" }],
      }));
      return server;
    },
  });
  managers.push(manager);
  return manager;
}

function post(body: unknown, sessionId?: string): Request {
  const headers = new Headers({
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  });
  if (sessionId) headers.set("MCP-Session-Id", sessionId);
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function initializeRequest(): Request {
  return post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "unit-test", version: "1.0.0" },
    },
  });
}

afterEach(async () => {
  await Promise.all(managers.splice(0).map((manager) => manager.close()));
});

describe("StatefulMcpSessionManager", () => {
  it("reuses one initialized session across requests", async () => {
    const manager = createManager();
    const initialized = await manager.handleRequest(
      initializeRequest(),
      credentialA,
    );
    const sessionId = initialized.headers.get("mcp-session-id");

    expect(initialized.status).toBe(200);
    expect(sessionId).toBe("session-1");
    expect(manager.status().activeSessions).toBe(1);

    const listed = await manager.handleRequest(
      post(
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        sessionId!,
      ),
      credentialA,
    );
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({
      jsonrpc: "2.0",
      id: 2,
      result: { tools: [expect.objectContaining({ name: "ping" })] },
    });
  });

  it("does not allow another credential to reuse a session", async () => {
    const manager = createManager();
    const initialized = await manager.handleRequest(
      initializeRequest(),
      credentialA,
    );
    const sessionId = initialized.headers.get("mcp-session-id")!;

    const response = await manager.handleRequest(
      post(
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        sessionId,
      ),
      { authenticationId: "credential-b", tenantId: "tenant-a" },
    );
    expect(response.status).toBe(404);

    const wrongTenant = await manager.handleRequest(
      post(
        { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
        sessionId,
      ),
      { authenticationId: "credential-a", tenantId: "tenant-b" },
    );
    expect(wrongTenant.status).toBe(404);
  });

  it("keeps concurrent sessions independent", async () => {
    const manager = createManager();
    const [first, second] = await Promise.all([
      manager.handleRequest(initializeRequest(), credentialA),
      manager.handleRequest(initializeRequest(), credentialA),
    ]);
    expect(first.headers.get("mcp-session-id")).not.toBe(
      second.headers.get("mcp-session-id"),
    );
    expect(manager.status().activeSessions).toBe(2);
  });

  it("enforces capacity and releases it after a session closes", async () => {
    const manager = createManager({ maxSessions: 1 });
    const initialized = await manager.handleRequest(
      initializeRequest(),
      credentialA,
    );
    const sessionId = initialized.headers.get("mcp-session-id")!;

    const full = await manager.handleRequest(
      initializeRequest(),
      credentialA,
    );
    expect(full.status).toBe(503);

    await expect(manager.closeSession(sessionId)).resolves.toBe(true);
    const retried = await manager.handleRequest(
      initializeRequest(),
      credentialA,
    );
    expect(retried.status).toBe(200);
  });

  it("sweeps sessions after the configured idle timeout", async () => {
    let now = 0;
    const manager = createManager({ getTime: () => now });
    await manager.handleRequest(initializeRequest(), credentialA);

    now = 30_001;
    await expect(manager.sweepExpiredSessions()).resolves.toBe(1);
    expect(manager.status().activeSessions).toBe(0);
  });

  it("requires initialization before other requests", async () => {
    const manager = createManager();
    const response = await manager.handleRequest(
      post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      credentialA,
    );
    expect(response.status).toBe(400);
  });
});
