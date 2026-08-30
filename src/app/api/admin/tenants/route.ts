import { z } from "zod";

import {
  adminErrorResponse,
  assertSameOrigin,
  forbiddenOriginResponse,
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

const createTenantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
});

export async function POST(request: Request): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  const parsed = createTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Tenant name and slug are required." }, { status: 400 });
  }
  try {
    return Response.json(await getAdminRuntime().createTenant(
      parsed.data,
      session.identity.credentialId,
    ), {
      status: 201,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
