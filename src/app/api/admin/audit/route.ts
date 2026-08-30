import { z } from "zod";

import {
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  afterId: z.coerce.number().int().nonnegative().optional(),
  after: z.coerce.date().optional(),
  before: z.coerce.date().optional(),
  eventType: z.string().min(1).max(160).optional(),
  outcome: z.enum(["success", "denied", "failed"]).optional(),
  tenantId: z.string().uuid().optional(),
  credentialId: z.string().uuid().optional(),
  sessionId: z.string().min(1).max(200).optional(),
  correlationId: z.string().min(1).max(200).optional(),
  resourceType: z.string().min(1).max(120).optional(),
  resourceId: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: Request): Promise<Response> {
  if (!(await requireAdminSession())) return unauthorizedAdminResponse();
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid audit history filters." }, { status: 400 });
  }
  const events = await getAdminRuntime().listAuditEvents(parsed.data);
  return Response.json(
    {
      events,
      nextCursor: events.at(-1)?.id ?? parsed.data.afterId ?? null,
      hasMore: events.length === parsed.data.limit,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
