import { parseHttpMcpEnvironment } from "@/integrations/mcp/http-environment";
import { getCmsMcpHttpRuntime } from "@/integrations/mcp/http-runtime";
import {
  createMcpCorsHeaders,
  getHttpBearerToken,
  withMcpCors,
} from "@/integrations/mcp/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleMcpRequest(request: Request): Promise<Response> {
  const environment = parseHttpMcpEnvironment(process.env);
  const plaintextKey = getHttpBearerToken(request);
  const runtime = getCmsMcpHttpRuntime(environment);
  const authentication = await runtime.authenticate(plaintextKey);
  if (authentication.outcome !== "authenticated") {
    if (
      authentication.outcome === "revoked" ||
      authentication.outcome === "tenant_disabled"
    ) {
      await runtime.closeSessionsForCredential(authentication.credentialId);
    }
    return withMcpCors(
      Response.json(
        { error: "Unauthorized MCP request." },
        {
          status: 401,
          headers: { "WWW-Authenticate": "Bearer" },
        },
      ),
      request,
      environment.CMS_MCP_ALLOWED_ORIGINS,
    );
  }

  if (authentication.actor.role === "admin") {
    await runtime.recordAuthorizationDenied(
      authentication.actor,
      "admin_mcp_forbidden",
    );
    return withMcpCors(
      Response.json(
        { error: "Admin credentials are only accepted by the admin REST API." },
        { status: 403 },
      ),
      request,
      environment.CMS_MCP_ALLOWED_ORIGINS,
    );
  }

  try {
    return withMcpCors(
      await runtime.handleRequest(request, authentication.actor),
      request,
      environment.CMS_MCP_ALLOWED_ORIGINS,
    );
  } catch {
    return withMcpCors(
      Response.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal MCP server error." },
          id: null,
        },
        { status: 500 },
      ),
      request,
      environment.CMS_MCP_ALLOWED_ORIGINS,
    );
  }
}

export function OPTIONS(request: Request): Response {
  const environment = parseHttpMcpEnvironment(process.env);
  return new Response(null, {
    status: 204,
    headers: createMcpCorsHeaders(
      request,
      environment.CMS_MCP_ALLOWED_ORIGINS,
    ),
  });
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
