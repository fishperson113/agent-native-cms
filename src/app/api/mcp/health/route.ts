import { parseHttpMcpEnvironment } from "@/integrations/mcp/http-environment";
import { getCmsMcpHttpRuntime } from "@/integrations/mcp/http-runtime";
import {
  getHttpBearerToken,
  withMcpCors,
} from "@/integrations/mcp/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const environment = parseHttpMcpEnvironment(process.env);
  const runtime = getCmsMcpHttpRuntime(environment);
  const plaintextKey = getHttpBearerToken(request);
  const authentication = plaintextKey
    ? await runtime.authenticate(plaintextKey)
    : { outcome: "invalid" as const };
  if (
    authentication.outcome !== "authenticated" ||
    authentication.actor.role !== "tenant"
  ) {
    return withMcpCors(
      Response.json(
        { error: "Unauthorized MCP status request." },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
      ),
      request,
      environment.CMS_MCP_ALLOWED_ORIGINS,
    );
  }

  const status = await runtime.status();
  return withMcpCors(
    Response.json(status, {
      status: status.database === "ready" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }),
    request,
    environment.CMS_MCP_ALLOWED_ORIGINS,
  );
}
