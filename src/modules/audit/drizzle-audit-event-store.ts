import { randomUUID } from "node:crypto";

import { and, asc, eq, gt, gte, lte, sql } from "drizzle-orm";

import type { DatabaseExecutor } from "@/infrastructure/database/client";
import { auditEvents } from "@/infrastructure/database/schema";

import {
  assertSafeAuditMetadata,
  type AppendAuditEvent,
  type AuditEvent,
  type AuditEventFilters,
} from "./audit-event";

export class DrizzleAuditEventStore {
  constructor(private readonly db: DatabaseExecutor) {}

  async append(input: AppendAuditEvent): Promise<AuditEvent> {
    const metadata = input.metadata ?? {};
    assertSafeAuditMetadata(metadata);
    const [row] = await this.db
      .insert(auditEvents)
      .values({
        eventId: randomUUID(),
        eventType: input.eventType,
        actorRole: input.actorRole,
        credentialId: input.credentialId,
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        correlationId: input.correlationId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        outcome: input.outcome,
        durationMs: input.durationMs,
        metadata,
      })
      .returning();
    const event = this.toEvent(row);
    await this.db.execute(
      sql`select pg_notify('cms_audit_events', ${String(event.id)})`,
    );
    return event;
  }

  async list(filters: AuditEventFilters = {}): Promise<AuditEvent[]> {
    const conditions = [
      filters.afterId === undefined ? undefined : gt(auditEvents.id, filters.afterId),
      filters.after === undefined ? undefined : gte(auditEvents.occurredAt, filters.after),
      filters.before === undefined ? undefined : lte(auditEvents.occurredAt, filters.before),
      filters.eventType === undefined ? undefined : eq(auditEvents.eventType, filters.eventType),
      filters.outcome === undefined ? undefined : eq(auditEvents.outcome, filters.outcome),
      filters.tenantId === undefined ? undefined : eq(auditEvents.tenantId, filters.tenantId),
      filters.credentialId === undefined ? undefined : eq(auditEvents.credentialId, filters.credentialId),
      filters.sessionId === undefined ? undefined : eq(auditEvents.sessionId, filters.sessionId),
      filters.correlationId === undefined ? undefined : eq(auditEvents.correlationId, filters.correlationId),
      filters.resourceType === undefined ? undefined : eq(auditEvents.resourceType, filters.resourceType),
      filters.resourceId === undefined ? undefined : eq(auditEvents.resourceId, filters.resourceId),
    ].filter((condition) => condition !== undefined);
    const rows = await this.db
      .select()
      .from(auditEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(auditEvents.id))
      .limit(Math.min(Math.max(filters.limit ?? 100, 1), 200));
    return rows.map((row) => this.toEvent(row));
  }

  private toEvent(row: typeof auditEvents.$inferSelect): AuditEvent {
    return {
      ...row,
      occurredAt: row.occurredAt.toISOString(),
      metadata: row.metadata,
    };
  }
}
