import {
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!(await requireAdminSession())) return unauthorizedAdminResponse();
  return Response.json(await getAdminRuntime().snapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
