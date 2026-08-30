import { cookies } from "next/headers";

import { DomainError } from "@/shared/kernel/domain-error";

import { getAdminRuntime } from "./admin-runtime";

export const ADMIN_SESSION_COOKIE = "cms_admin_session";

export async function getAdminSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
}

export async function requireAdminSession() {
  const token = await getAdminSessionToken();
  const identity = await getAdminRuntime().authenticateSession(token);
  if (!identity) {
    await getAdminRuntime().recordAdminAuthenticationDenied(
      token ? "invalid_or_expired_session" : "missing_session",
    );
    return null;
  }
  return { identity, token: token! };
}

export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;

  const configuredOrigins = process.env.CMS_ADMIN_ALLOWED_ORIGINS?.trim();
  if (configuredOrigins) {
    return configuredOrigins
      .split(",")
      .map((candidate) => candidate.trim())
      .filter(Boolean)
      .some((candidate) => {
        try {
          return new URL(candidate).origin === origin;
        } catch {
          return false;
        }
      });
  }

  return origin === new URL(request.url).origin;
}

export function adminErrorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.code.includes("NOT_FOUND") ? 404 : 400 },
    );
  }
  return Response.json(
    { error: "The admin operation could not be completed." },
    { status: 500 },
  );
}

export function unauthorizedAdminResponse(): Response {
  return Response.json({ error: "Admin authentication required." }, { status: 401 });
}

export function forbiddenOriginResponse(): Response {
  return Response.json({ error: "Cross-origin admin request rejected." }, { status: 403 });
}
