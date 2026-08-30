export const AUDIT_EVENT_CHANNEL = "cms_audit_events";

export type AuditActorRole = "admin" | "tenant" | "system" | "anonymous";
export type AuditOutcome = "success" | "denied" | "failed";
export type AuditMetadata = Record<string, string | number | boolean | null>;

export type AppendAuditEvent = {
  eventType: string;
  actorRole: AuditActorRole;
  credentialId?: string | null;
  tenantId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome: AuditOutcome;
  durationMs?: number | null;
  metadata?: AuditMetadata;
};

export type AuditEvent = Required<
  Pick<AppendAuditEvent, "eventType" | "actorRole" | "outcome">
> & {
  id: number;
  eventId: string;
  occurredAt: string;
  credentialId: string | null;
  tenantId: string | null;
  sessionId: string | null;
  correlationId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  durationMs: number | null;
  metadata: AuditMetadata;
};

export type AuditEventFilters = {
  afterId?: number;
  before?: Date;
  after?: Date;
  eventType?: string;
  outcome?: AuditOutcome;
  tenantId?: string;
  credentialId?: string;
  sessionId?: string;
  correlationId?: string;
  resourceType?: string;
  resourceId?: string;
  limit?: number;
};

export interface AuditEventSink {
  append(input: AppendAuditEvent): Promise<AuditEvent>;
}

const forbiddenMetadataKeys = new Set([
  "authorization",
  "bearer",
  "key",
  "keyhash",
  "plaintextkey",
  "secret",
  "markdown",
  "source",
  "sourcecode",
  "compiledcode",
  "payload",
  "headers",
]);

export function assertSafeAuditMetadata(metadata: AuditMetadata): void {
  for (const [key, value] of Object.entries(metadata)) {
    const normalized = key.replace(/[_-]/g, "").toLowerCase();
    if (forbiddenMetadataKeys.has(normalized)) {
      throw new Error(`Unsafe audit metadata field: ${key}`);
    }
    if (
      typeof value === "string" &&
      (/^Bearer\s/i.test(value) || /^cms_[a-f0-9]{12}_/i.test(value))
    ) {
      throw new Error(`Secret-like audit metadata value: ${key}`);
    }
  }
}
