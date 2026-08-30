import { cookies } from "next/headers";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  assertSameOrigin,
  forbiddenOriginResponse,
  getAdminSessionToken,
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({ key: z.string().min(16).max(512) });

export async function GET(): Promise<Response> {
  const session = await requireAdminSession();
  if (!session) return unauthorizedAdminResponse();
  return Response.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "A valid admin key is required." }, { status: 400 });
  }
  const session = await getAdminRuntime().login(parsed.data.key);
  if (!session) return unauthorizedAdminResponse();

  (await cookies()).set(ADMIN_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  return Response.json({ authenticated: true });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!assertSameOrigin(request)) return forbiddenOriginResponse();
  const token = await getAdminSessionToken();
  await getAdminRuntime().logout(token);
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
