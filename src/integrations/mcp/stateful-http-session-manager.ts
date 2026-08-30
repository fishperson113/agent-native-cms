import { randomUUID } from "node:crypto";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { InMemoryMcpEventStore } from "./in-memory-mcp-event-store";

type SessionEntry = {
  authenticationId: string;
  tenantId: string;
  createdAt: number;
  lastActivityAt: number;
  server: McpServer;
  transport: WebStandardStreamableHTTPServerTransport;
  closing: boolean;
};

export type McpSessionIdentity = {
  authenticationId: string;
  tenantId: string;
  sessionId?: string;
};

export type McpSessionCloseReason =
  | "client"
  | "expired"
  | "credential_revoked"
  | "tenant_disabled"
  | "admin"
  | "shutdown";

export type StatefulMcpSessionManagerOptions = {
  createServer: (identity: McpSessionIdentity) => McpServer;
  idleTimeoutMs: number;
  maxSessions: number;
  cleanupIntervalMs?: number;
  getTime?: () => number;
  generateSessionId?: () => string;
  onSessionOpened?: (
    sessionId: string,
    identity: McpSessionIdentity,
  ) => Promise<void>;
  onSessionClosed?: (
    sessionId: string,
    identity: McpSessionIdentity,
    reason: McpSessionCloseReason,
  ) => Promise<void>;
};

export type StatefulMcpSessionManagerStatus = {
  activeSessions: number;
  idleTimeoutMs: number;
  maxSessions: number;
  pendingInitializations: number;
};

export type McpSessionSummary = {
  sessionId: string;
  credentialId: string;
  tenantId: string;
  createdAt: string;
  lastActivityAt: string;
};

function jsonRpcError(
  status: number,
  code: number,
  message: string,
): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    },
    { status },
  );
}

export class StatefulMcpSessionManager {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly createServer: (identity: McpSessionIdentity) => McpServer;
  private readonly idleTimeoutMs: number;
  private readonly maxSessions: number;
  private readonly getTime: () => number;
  private readonly generateSessionId: () => string;
  private readonly onSessionOpened?: StatefulMcpSessionManagerOptions["onSessionOpened"];
  private readonly onSessionClosed?: StatefulMcpSessionManagerOptions["onSessionClosed"];
  private readonly cleanupTimer?: ReturnType<typeof setInterval>;
  private pendingInitializations = 0;
  private closed = false;

  constructor(options: StatefulMcpSessionManagerOptions) {
    this.createServer = options.createServer;
    this.idleTimeoutMs = options.idleTimeoutMs;
    this.maxSessions = options.maxSessions;
    this.getTime = options.getTime ?? Date.now;
    this.generateSessionId = options.generateSessionId ?? randomUUID;
    this.onSessionOpened = options.onSessionOpened;
    this.onSessionClosed = options.onSessionClosed;

    const cleanupIntervalMs = options.cleanupIntervalMs ?? 60_000;
    if (cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        void this.sweepExpiredSessions();
      }, cleanupIntervalMs);
      this.cleanupTimer.unref?.();
    }
  }

  status(): StatefulMcpSessionManagerStatus {
    return {
      activeSessions: this.sessions.size,
      idleTimeoutMs: this.idleTimeoutMs,
      maxSessions: this.maxSessions,
      pendingInitializations: this.pendingInitializations,
    };
  }

  listSessions(): McpSessionSummary[] {
    return [...this.sessions.entries()]
      .map(([sessionId, session]) => ({
        sessionId,
        credentialId: session.authenticationId,
        tenantId: session.tenantId,
        createdAt: new Date(session.createdAt).toISOString(),
        lastActivityAt: new Date(session.lastActivityAt).toISOString(),
      }))
      .sort((left, right) =>
        right.lastActivityAt.localeCompare(left.lastActivityAt),
      );
  }

  async handleRequest(
    request: Request,
    identity: McpSessionIdentity,
  ): Promise<Response> {
    if (this.closed) {
      return jsonRpcError(503, -32000, "MCP runtime is shutting down.");
    }

    const sessionId = request.headers.get("mcp-session-id");
    if (sessionId) {
      return this.handleExistingSession(
        request,
        sessionId,
        identity,
      );
    }

    if (request.method !== "POST") {
      return jsonRpcError(
        400,
        -32000,
        "A valid MCP-Session-Id is required.",
      );
    }

    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return jsonRpcError(400, -32700, "Invalid JSON request body.");
    }
    if (!isInitializeRequest(body)) {
      return jsonRpcError(
        400,
        -32000,
        "Initialize the MCP session before calling tools.",
      );
    }

    if (
      this.sessions.size + this.pendingInitializations >=
      this.maxSessions
    ) {
      return jsonRpcError(503, -32000, "MCP session capacity reached.");
    }

    return this.initializeSession(request, identity);
  }

  async sweepExpiredSessions(): Promise<number> {
    const expiredBefore = this.getTime() - this.idleTimeoutMs;
    const expiredIds = [...this.sessions.entries()]
      .filter(([, session]) => session.lastActivityAt <= expiredBefore)
      .map(([sessionId]) => sessionId);

    await Promise.all(
      expiredIds.map((sessionId) => this.closeSession(sessionId, "expired")),
    );
    return expiredIds.length;
  }

  async closeSession(
    sessionId: string,
    reason: McpSessionCloseReason = "client",
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    if (session.closing) return true;
    session.closing = true;
    await session.server.close();
    await this.onSessionClosed?.(
      sessionId,
      {
        authenticationId: session.authenticationId,
        tenantId: session.tenantId,
        sessionId,
      },
      reason,
    );
    return true;
  }

  async closeSessionsByAuthenticationId(
    authenticationId: string,
  ): Promise<number> {
    const sessionIds = [...this.sessions.entries()]
      .filter(([, session]) => session.authenticationId === authenticationId)
      .map(([sessionId]) => sessionId);
    await Promise.all(
      sessionIds.map((sessionId) =>
        this.closeSession(sessionId, "credential_revoked"),
      ),
    );
    return sessionIds.length;
  }

  async closeSessionsByTenantId(tenantId: string): Promise<number> {
    const sessionIds = [...this.sessions.entries()]
      .filter(([, session]) => session.tenantId === tenantId)
      .map(([sessionId]) => sessionId);
    await Promise.all(
      sessionIds.map((sessionId) =>
        this.closeSession(sessionId, "tenant_disabled"),
      ),
    );
    return sessionIds.length;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    await Promise.all(
      [...this.sessions.keys()].map((sessionId) =>
        this.closeSession(sessionId, "shutdown"),
      ),
    );
  }

  private async handleExistingSession(
    request: Request,
    sessionId: string,
    identity: McpSessionIdentity,
  ): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (
      !session ||
      session.authenticationId !== identity.authenticationId ||
      session.tenantId !== identity.tenantId
    ) {
      return jsonRpcError(404, -32001, "MCP session was not found.");
    }

    session.lastActivityAt = this.getTime();
    return session.transport.handleRequest(request);
  }

  private async initializeSession(
    request: Request,
    identity: McpSessionIdentity,
  ): Promise<Response> {
    this.pendingInitializations += 1;
    const server = this.createServer(identity);
    const eventStore = new InMemoryMcpEventStore();
    let initializedSessionId: string | undefined;
    let entry: SessionEntry | undefined;

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: this.generateSessionId,
      enableJsonResponse: true,
      eventStore,
      onsessioninitialized: (sessionId) => {
        initializedSessionId = sessionId;
        identity.sessionId = sessionId;
        const timestamp = this.getTime();
        entry = {
          authenticationId: identity.authenticationId,
          tenantId: identity.tenantId,
          createdAt: timestamp,
          lastActivityAt: timestamp,
          server,
          transport,
          closing: false,
        };
        this.sessions.set(sessionId, entry);
      },
      onsessionclosed: (sessionId) => {
        void this.closeSession(sessionId, "client");
      },
    });

    transport.onclose = () => {
      if (initializedSessionId) {
        this.sessions.delete(initializedSessionId);
      }
    };

    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      if (initializedSessionId) {
        await this.onSessionOpened?.(initializedSessionId, identity);
      }
      if (!initializedSessionId || !entry) {
        await server.close();
      }
      return response;
    } catch (error) {
      if (initializedSessionId) {
        this.sessions.delete(initializedSessionId);
      }
      await server.close().catch(() => undefined);
      throw error;
    } finally {
      this.pendingInitializations -= 1;
    }
  }
}
