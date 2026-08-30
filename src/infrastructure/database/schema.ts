import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: ["active", "disabled"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    markdown: text("markdown").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    // The circular FK to article_presentations is added explicitly in migration 0001.
    activePresentationId: uuid("active_presentation_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("articles_tenant_slug_unique").on(
      table.tenantId,
      table.slug,
    ),
    index("idx_articles_tenant").on(table.tenantId),
  ],
);

export const articlePresentations = pgTable(
  "article_presentations",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    sourceCode: text("source_code").notNull(),
    compiledCode: text("compiled_code"),
    status: text("status", {
      enum: ["draft", "compiled", "failed", "active"],
    })
      .notNull()
      .default("draft"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_presentations_tenant").on(table.tenantId),
    index("idx_presentations_article").on(table.articleId),
  ],
);

export const mcpCredentials = pgTable(
  "mcp_credentials",
  {
    id: uuid("id").primaryKey(),
    role: text("role", { enum: ["admin", "tenant"] }).notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    note: text("note"),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    plaintextKey: text("plaintext_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("mcp_credentials_key_prefix_unique").on(table.keyPrefix),
    index("idx_mcp_credentials_role").on(table.role),
    index("idx_mcp_credentials_tenant").on(table.tenantId),
    check(
      "mcp_credentials_role_tenant_check",
      sql`(${table.role} = 'admin' AND ${table.tenantId} IS NULL) OR (${table.role} = 'tenant' AND ${table.tenantId} IS NOT NULL)`,
    ),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey(),
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => mcpCredentials.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("admin_sessions_token_hash_unique").on(table.tokenHash),
    index("idx_admin_sessions_credential").on(table.credentialId),
    index("idx_admin_sessions_expires").on(table.expiresAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    eventId: uuid("event_id").notNull().unique(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventType: text("event_type").notNull(),
    actorRole: text("actor_role", {
      enum: ["admin", "tenant", "system", "anonymous"],
    }).notNull(),
    credentialId: uuid("credential_id"),
    tenantId: uuid("tenant_id"),
    sessionId: text("session_id"),
    correlationId: text("correlation_id"),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    outcome: text("outcome", {
      enum: ["success", "denied", "failed"],
    }).notNull(),
    durationMs: integer("duration_ms"),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
  },
  (table) => [
    index("idx_audit_events_occurred_at").on(table.occurredAt),
    index("idx_audit_events_tenant_id").on(table.tenantId, table.id),
    index("idx_audit_events_event_type").on(table.eventType, table.id),
    index("idx_audit_events_credential_id").on(
      table.credentialId,
      table.id,
    ),
    index("idx_audit_events_correlation_id").on(table.correlationId),
  ],
);

export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;
export type ArticleRow = typeof articles.$inferSelect;
export type NewArticleRow = typeof articles.$inferInsert;
export type ArticlePresentationRow = typeof articlePresentations.$inferSelect;
export type NewArticlePresentationRow = typeof articlePresentations.$inferInsert;
export type McpCredentialRow = typeof mcpCredentials.$inferSelect;
export type NewMcpCredentialRow = typeof mcpCredentials.$inferInsert;
export type AdminSessionRow = typeof adminSessions.$inferSelect;
export type NewAdminSessionRow = typeof adminSessions.$inferInsert;
export type AuditEventRow = typeof auditEvents.$inferSelect;
export type NewAuditEventRow = typeof auditEvents.$inferInsert;
