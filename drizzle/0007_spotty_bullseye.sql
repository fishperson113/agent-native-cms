CREATE TABLE "audit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"actor_role" text NOT NULL,
	"credential_id" uuid,
	"tenant_id" uuid,
	"session_id" text,
	"correlation_id" text,
	"resource_type" text,
	"resource_id" text,
	"outcome" text NOT NULL,
	"duration_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "audit_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE INDEX "idx_audit_events_occurred_at" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_tenant_id" ON "audit_events" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_event_type" ON "audit_events" USING btree ("event_type","id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_credential_id" ON "audit_events" USING btree ("credential_id","id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_correlation_id" ON "audit_events" USING btree ("correlation_id");