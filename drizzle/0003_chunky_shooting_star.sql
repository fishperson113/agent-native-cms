CREATE TABLE "mcp_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"tenant_id" uuid,
	"name" text NOT NULL,
	"note" text,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "mcp_credentials_role_tenant_check" CHECK (("mcp_credentials"."role" = 'admin' AND "mcp_credentials"."tenant_id" IS NULL) OR ("mcp_credentials"."role" = 'tenant' AND "mcp_credentials"."tenant_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "mcp_credentials" ADD CONSTRAINT "mcp_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_credentials_key_prefix_unique" ON "mcp_credentials" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_mcp_credentials_role" ON "mcp_credentials" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_mcp_credentials_tenant" ON "mcp_credentials" USING btree ("tenant_id");
