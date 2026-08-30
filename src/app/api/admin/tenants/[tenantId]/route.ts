import { z } from "zod";

import {
  adminErrorResponse,
  assertSameOrigin,
  forbiddenOriginResponse,
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Status must be active or disabled." }, { status: 400 });
  }
  try {
    const { tenantId } = await context.params;
    return Response.json(
      await getAdminRuntime().setTenantStatus(
        tenantId,
        parsed.data.status,
        session.identity.credentialId,
      ),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
