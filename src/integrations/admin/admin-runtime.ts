import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { createDatabase } from "@/infrastructure/database/client";
import { adminSessions, mcpCredentials } from "@/infrastructure/database/schema";
import { parseHttpMcpEnvironment } from "@/integrations/mcp/http-environment";
import { getCmsMcpHttpRuntime } from "@/integrations/mcp/http-runtime";
import type { AuditEventFilters } from "@/modules/audit/audit-event";
import { DrizzleAuditEventStore } from "@/modules/audit/drizzle-audit-event-store";

const ADMIN_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1_000;

export type AdminSessionIdentity = {
  credentialId: string;
};

export class AdminRuntime {
  private readonly database;
  private readonly access;
  private readonly mcpRuntime;
  private readonly audit;

  constructor(databaseUrl: string) {
    this.database = createDatabase(databaseUrl);
    this.access = createMcpAccessServices(this.database.db);
    this.audit = new DrizzleAuditEventStore(this.database.db);
    this.mcpRuntime = getCmsMcpHttpRuntime(
      parseHttpMcpEnvironment(process.env),
    );
  }

  async login(plaintextKey: string) {
    const authentication = await this.access.authenticateCredential.execute(
      plaintextKey,
    );
    if (
      authentication.outcome !== "authenticated" ||
      authentication.actor.role !== "admin"
    ) {
      await this.audit.append({
        eventType: "admin.authentication.failed.v1",
        actorRole: "anonymous",
        outcome: "denied",
        metadata: { reason: "invalid_or_non_admin" },
      });
      return null;
    }

    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ADMIN_SESSION_LIFETIME_MS);
    await this.database.db.transaction(async (tx) => {
      await tx.insert(adminSessions).values({
        id: randomUUID(),
        credentialId: authentication.actor.credentialId,
        tokenHash: this.hashToken(token),
        createdAt: now,
        expiresAt,
        lastSeenAt: now,
      });
      await new DrizzleAuditEventStore(tx).append({
        eventType: "admin.authentication.succeeded.v1",
        actorRole: "admin",
        credentialId: authentication.actor.credentialId,
        outcome: "success",
      });
    });
    return { token, expiresAt };
  }

  async authenticateSession(
    token: string | undefined,
  ): Promise<AdminSessionIdentity | null> {
    if (!token) return null;
    const now = new Date();
    const [row] = await this.database.db
      .select({ credentialId: adminSessions.credentialId })
      .from(adminSessions)
      .innerJoin(
        mcpCredentials,
        eq(adminSessions.credentialId, mcpCredentials.id),
      )
      .where(
        and(
          eq(adminSessions.tokenHash, this.hashToken(token)),
          isNull(adminSessions.revokedAt),
          gt(adminSessions.expiresAt, now),
          eq(mcpCredentials.role, "admin"),
          isNull(mcpCredentials.revokedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    await this.database.db
      .update(adminSessions)
      .set({ lastSeenAt: now })
      .where(eq(adminSessions.tokenHash, this.hashToken(token)));
    return row;
  }

  async recordAdminAuthenticationDenied(reason: string): Promise<void> {
    await this.audit.append({
      eventType: "admin.authentication.failed.v1",
      actorRole: "anonymous",
      outcome: "denied",
      metadata: { reason },
    });
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.database.db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.tokenHash, this.hashToken(token)));
  }

  async snapshot() {
    const tenants = await this.access.listTenants.execute();
    const [credentialDtos, credentialSecrets, runtime, articleGroups] = await Promise.all([
      this.access.listCredentials.execute(),
      this.database.db
        .select({
          id: mcpCredentials.id,
          plaintextKey: mcpCredentials.plaintextKey,
        })
        .from(mcpCredentials)
        .where(eq(mcpCredentials.role, "tenant")),
      this.mcpRuntime.status(),
      Promise.all(
        tenants.map(async (tenant) => ({
          tenant,
          articles: await this.access.listArticles.execute({
            tenantId: tenant.id,
          }),
        })),
      ),
    ]);
    const plaintextByCredentialId = new Map(
      credentialSecrets.map((credential) => [
        credential.id,
        credential.plaintextKey,
      ]),
    );
    const credentials = credentialDtos
      .filter((credential) => credential.role === "tenant")
      .map((credential) => ({
        ...credential,
        plaintextKey: !credential.revokedAt
          ? (plaintextByCredentialId.get(credential.id) ?? null)
          : null,
      }));
    return {
      tenants,
      credentials,
      articles: articleGroups.flatMap(({ tenant, articles }) =>
        articles.map((article) => ({
          ...article,
          tenantName: tenant.name,
        })),
      ),
      runtime,
      sessions: this.mcpRuntime.listSessions(),
    };
  }

  async createTenant(
    input: { name: string; slug: string },
    actorCredentialId?: string,
  ) {
    return this.database.db.transaction(async (tx) => {
      const tenant = await createMcpAccessServices(tx).createTenant.execute(input);
      await new DrizzleAuditEventStore(tx).append({
        eventType: "admin.tenant.created.v1",
        actorRole: actorCredentialId ? "admin" : "system",
        credentialId: actorCredentialId,
        tenantId: tenant.id,
        resourceType: "tenant",
        resourceId: tenant.id,
        outcome: "success",
        metadata: { slug: tenant.slug },
      });
      return tenant;
    });
  }

  async setTenantStatus(
    tenantId: string,
    status: "active" | "disabled",
    actorCredentialId?: string,
  ) {
    const tenant = await this.database.db.transaction(async (tx) => {
      const updated = await createMcpAccessServices(tx).setTenantStatus.execute({
        tenantId,
        status,
      });
      await new DrizzleAuditEventStore(tx).append({
        eventType: "admin.tenant.status_changed.v1",
        actorRole: actorCredentialId ? "admin" : "system",
        credentialId: actorCredentialId,
        tenantId,
        resourceType: "tenant",
        resourceId: tenantId,
        outcome: "success",
        metadata: { status },
      });
      return updated;
    });
    if (status === "disabled") {
      await this.mcpRuntime.closeSessionsForTenant(tenantId);
    }
    return tenant;
  }

  async issueTenantCredential(input: {
    tenantId: string;
    name: string;
    note?: string;
  }, actorCredentialId?: string) {
    return this.database.db.transaction(async (tx) => {
      const issued = await createMcpAccessServices(tx).issueCredential.execute({
        role: "tenant",
        ...input,
      });
      await tx
        .update(mcpCredentials)
        .set({ plaintextKey: issued.plaintextKey })
        .where(eq(mcpCredentials.id, issued.credential.id));
      await new DrizzleAuditEventStore(tx).append({
        eventType: "admin.credential.issued.v1",
        actorRole: actorCredentialId ? "admin" : "system",
        credentialId: actorCredentialId,
        tenantId: input.tenantId,
        resourceType: "credential",
        resourceId: issued.credential.id,
        outcome: "success",
        metadata: { role: "tenant", name: input.name },
      });
      return issued;
    });
  }

  async revokeCredential(credentialId: string, actorCredentialId?: string) {
    const credential = await this.database.db.transaction(async (tx) => {
      const revoked = await createMcpAccessServices(tx).revokeCredential.execute({
        credentialId,
      });
      await new DrizzleAuditEventStore(tx).append({
        eventType: "admin.credential.revoked.v1",
        actorRole: actorCredentialId ? "admin" : "system",
        credentialId: actorCredentialId,
        tenantId: revoked.tenantId,
        resourceType: "credential",
        resourceId: credentialId,
        outcome: "success",
        metadata: { role: revoked.role },
      });
      return revoked;
    });
    await this.mcpRuntime.closeSessionsForCredential(credentialId);
    return credential;
  }

  async deleteArticle(
    tenantId: string,
    articleId: string,
    actorCredentialId?: string,
  ) {
    await this.database.db.transaction(async (tx) => {
      await createMcpAccessServices(tx).deleteArticle.execute({ tenantId, articleId });
      await new DrizzleAuditEventStore(tx).append({
        eventType: "admin.article.deleted.v1",
        actorRole: actorCredentialId ? "admin" : "system",
        credentialId: actorCredentialId,
        tenantId,
        resourceType: "article",
        resourceId: articleId,
        outcome: "success",
      });
    });
  }

  async closeMcpSession(sessionId: string, actorCredentialId?: string) {
    const closed = await this.mcpRuntime.closeSession(sessionId);
    if (closed) {
      await this.audit.append({
        eventType: "admin.session.closed.v1",
        actorRole: actorCredentialId ? "admin" : "system",
        credentialId: actorCredentialId,
        sessionId,
        resourceType: "mcp_session",
        resourceId: sessionId,
        outcome: "success",
      });
    }
    return closed;
  }

  listAuditEvents(filters: AuditEventFilters = {}) {
    return this.audit.list(filters);
  }

  async close(): Promise<void> {
    await this.database.close();
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}

type AdminRuntimeGlobal = typeof globalThis & {
  __agentNativeCmsAdminRuntime?: AdminRuntime;
};

const adminRuntimeGlobal = globalThis as AdminRuntimeGlobal;

export function getAdminRuntime(): AdminRuntime {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  adminRuntimeGlobal.__agentNativeCmsAdminRuntime ??= new AdminRuntime(
    databaseUrl,
  );
  return adminRuntimeGlobal.__agentNativeCmsAdminRuntime;
}
