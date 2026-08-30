import { createHash, timingSafeEqual } from "node:crypto";

export function authenticateHttpMcpRequest(
  request: Request,
  expectedKey: string,
): string | undefined {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;

  const actual = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(expectedKey);
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return undefined;
  }

  return createHash("sha256").update(expectedKey).digest("hex");
}

export function getHttpBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length);
  return token.length > 0 ? token : undefined;
}

export function createMcpCorsHeaders(
  request: Request,
  configuredOrigins: string,
): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Expose-Headers":
      "MCP-Protocol-Version, MCP-Session-Id",
    Vary: "Origin",
  });

  const origins = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get("origin");
  if (origins.includes("*")) {
    headers.set("Access-Control-Allow-Origin", "*");
  } else if (requestOrigin && origins.includes(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
  }
  return headers;
}

export function withMcpCors(
  response: Response,
  request: Request,
  configuredOrigins: string,
): Response {
  const headers = new Headers(response.headers);
  createMcpCorsHeaders(request, configuredOrigins).forEach((value, name) => {
    headers.set(name, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
