import { parseEnvironment } from "@/infrastructure/config/environment";
import { createDatabase } from "@/infrastructure/database/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const environment = parseEnvironment(process.env);
  const database = createDatabase(environment.DATABASE_URL);

  try {
    await database.client`select 1`;
    return Response.json(
      { status: "ok", database: "reachable" },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { status: "degraded", database: "unavailable" },
      { status: 503, headers: responseHeaders },
    );
  } finally {
    await database.close();
  }
}
