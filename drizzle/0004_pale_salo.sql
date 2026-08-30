ALTER TABLE "mcp_credentials" DROP CONSTRAINT "mcp_credentials_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "mcp_credentials" ADD CONSTRAINT "mcp_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;