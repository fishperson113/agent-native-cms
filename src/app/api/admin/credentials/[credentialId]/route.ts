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
  context: { params: Promise<{ credentialId: string }> },
): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  try {
    const { credentialId } = await context.params;
    return Response.json(
      await getAdminRuntime().revokeCredential(
        credentialId,
        session.identity.credentialId,
      ),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
