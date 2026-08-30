import {
  adminErrorResponse,
  assertSameOrigin,
  forbiddenOriginResponse,
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ tenantId: string; articleId: string }> },
): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  try {
    const { tenantId, articleId } = await context.params;
    await getAdminRuntime().deleteArticle(
      tenantId,
      articleId,
      session.identity.credentialId,
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
