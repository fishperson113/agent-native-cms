import {
  assertSameOrigin,
  forbiddenOriginResponse,
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  const { sessionId } = await context.params;
  const closed = await getAdminRuntime().closeMcpSession(
    sessionId,
    session.identity.credentialId,
  );
  if (!closed) {
    return Response.json({ error: "MCP session was not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
