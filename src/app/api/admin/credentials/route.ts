import { z } from "zod";

import {
  adminErrorResponse,
  assertSameOrigin,
  forbiddenOriginResponse,
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

const issueSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Tenant and key name are required." }, { status: 400 });
  }
  try {
    return Response.json(
      await getAdminRuntime().issueTenantCredential(
        parsed.data,
        session.identity.credentialId,
      ),
      { status: 201 },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
