import { createCmsMcpKernel } from "@/infrastructure/composition/create-cms-mcp-kernel";
import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { createDatabase } from "@/infrastructure/database/client";
import type {
  AuthenticateMcpCredentialResult,
  McpActorContext,
} from "@/modules/access/application/authenticate-mcp-credential.handler";
import { DrizzleAuditEventStore } from "@/modules/audit/drizzle-audit-event-store";

import type { HttpMcpEnvironment } from "./http-environment";
import { JsonStderrCmsMcpObserver } from "./observability";
import { StatefulMcpSessionManager } from "./stateful-http-session-manager";

export type CmsMcpHttpRuntimeStatus = {
  activeSessions: number;
  database: "ready" | "unavailable";
  idleTimeoutMs: number;
  maxSessions: number;
  pendingInitializations: number;
  startedAt: string;
};

class CmsMcpHttpRuntime {
  private readonly database;
  private readonly sessions: StatefulMcpSessionManager;
  private readonly authenticateCredential;
  private readonly startedAt = new Date();
  private readonly audit;
  private closed = false;

  constructor(environment: HttpMcpEnvironment) {
    this.database = createDatabase(environment.DATABASE_URL);
    this.audit = new DrizzleAuditEventStore(this.database.db);
    this.authenticateCredential = createMcpAccessServices(
      this.database.db,
    ).authenticateCredential;
    this.sessions = new StatefulMcpSessionManager({
      idleTimeoutMs: environment.CMS_MCP_SESSION_IDLE_TIMEOUT_MS,
      maxSessions: environment.CMS_MCP_MAX_SESSIONS,
      createServer: (identity) =>
        createCmsMcpKernel({
          db: this.database.db,
          tenantId: identity.tenantId,
          credentialId: identity.authenticationId,
          getSessionId: () => identity.sessionId,
          audit: this.audit,
          observer: new JsonStderrCmsMcpObserver(),
        }),
      onSessionOpened: async (sessionId, identity) => {
        await this.audit.append({
          eventType: "mcp.session.opened.v1",
          actorRole: "tenant",
          credentialId: identity.authenticationId,
          tenantId: identity.tenantId,
          sessionId,
          resourceType: "mcp_session",
          resourceId: sessionId,
          outcome: "success",
        });
      },
      onSessionClosed: async (sessionId, identity, reason) => {
        await this.audit.append({
          eventType:
            reason === "expired"
              ? "mcp.session.expired.v1"
              : "mcp.session.closed.v1",
          actorRole: reason === "admin" ? "admin" : "tenant",
          credentialId: identity.authenticationId,
          tenantId: identity.tenantId,
          sessionId,
          resourceType: "mcp_session",
          resourceId: sessionId,
          outcome: "success",
          metadata: { reason },
        });
      },
    });
  }

  handleRequest(
    request: Request,
    actor: McpActorContext,
  ): Promise<Response> {
    if (actor.role === "admin") {
      return Promise.resolve(
        Response.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32003,
              message: "Admin credentials are not accepted by MCP.",
            },
            id: null,
          },
          { status: 403 },
        ),
      );
    }
    return this.sessions.handleRequest(request, {
      authenticationId: actor.credentialId,
      tenantId: actor.tenantId,
    });
  }

  async authenticate(
    plaintextKey: string | undefined,
  ): Promise<AuthenticateMcpCredentialResult> {
    let databaseResult: AuthenticateMcpCredentialResult;
    try {
      databaseResult = plaintextKey
        ? await this.authenticateCredential.execute(plaintextKey)
        : { outcome: "invalid" };
    } catch {
      databaseResult = { outcome: "invalid" };
    }
    if (databaseResult.outcome === "authenticated") {
      await this.audit.append({
        eventType: "mcp.authentication.succeeded.v1",
        actorRole: databaseResult.actor.role,
        credentialId: databaseResult.actor.credentialId,
        tenantId:
          databaseResult.actor.role === "tenant"
            ? databaseResult.actor.tenantId
            : null,
        outcome: "success",
      });
    } else {
      await this.audit.append({
        eventType: "mcp.authentication.failed.v1",
        actorRole: databaseResult.outcome === "invalid" ? "anonymous" : "tenant",
        credentialId:
          databaseResult.outcome === "invalid"
            ? null
            : databaseResult.credentialId,
        outcome: "denied",
        metadata: { reason: databaseResult.outcome },
      });
    }
    return databaseResult;
  }

  async recordAuthorizationDenied(
    actor: McpActorContext,
    reason: string,
  ): Promise<void> {
    await this.audit.append({
      eventType: "mcp.authentication.failed.v1",
      actorRole: actor.role,
      credentialId: actor.credentialId,
      tenantId: actor.role === "tenant" ? actor.tenantId : null,
      outcome: "denied",
      metadata: { reason },
    });
  }

  closeSessionsForCredential(credentialId: string): Promise<number> {
    return this.sessions.closeSessionsByAuthenticationId(credentialId);
  }

  closeSessionsForTenant(tenantId: string): Promise<number> {
    return this.sessions.closeSessionsByTenantId(tenantId);
  }

  listSessions() {
    return this.sessions.listSessions();
  }

  closeSession(sessionId: string): Promise<boolean> {
    return this.sessions.closeSession(sessionId, "admin");
  }

  async status(): Promise<CmsMcpHttpRuntimeStatus> {
    let database: CmsMcpHttpRuntimeStatus["database"] = "ready";
    try {
      await this.database.client`select 1`;
    } catch {
      database = "unavailable";
    }
    return {
      ...this.sessions.status(),
      database,
      startedAt: this.startedAt.toISOString(),
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.sessions.close();
    await this.database.close();
  }

}

type RuntimeGlobal = typeof globalThis & {
  __agentNativeCmsMcpRuntime?: CmsMcpHttpRuntime;
  __agentNativeCmsMcpShutdownRegistered?: boolean;
};

const runtimeGlobal = globalThis as RuntimeGlobal;

export function getCmsMcpHttpRuntime(
  environment: HttpMcpEnvironment,
): CmsMcpHttpRuntime {
  runtimeGlobal.__agentNativeCmsMcpRuntime ??= new CmsMcpHttpRuntime(environment);

  if (!runtimeGlobal.__agentNativeCmsMcpShutdownRegistered) {
    runtimeGlobal.__agentNativeCmsMcpShutdownRegistered = true;
    const shutdown = () => {
      void runtimeGlobal.__agentNativeCmsMcpRuntime?.close();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }

  return runtimeGlobal.__agentNativeCmsMcpRuntime;
}
