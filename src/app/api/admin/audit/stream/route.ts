import postgres from "postgres";
import { z } from "zod";

import {
  requireAdminSession,
  unauthorizedAdminResponse,
} from "@/integrations/admin/admin-http";
import { getAdminRuntime } from "@/integrations/admin/admin-runtime";
import { AUDIT_EVENT_CHANNEL } from "@/modules/audit/audit-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cursorSchema = z.coerce.number().int().nonnegative();

export async function GET(request: Request): Promise<Response> {
  if (!(await requireAdminSession())) return unauthorizedAdminResponse();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: "DATABASE_URL is required." }, { status: 500 });
  }
  const url = new URL(request.url);
  const cursorValue =
    request.headers.get("last-event-id") ?? url.searchParams.get("after") ?? "0";
  const parsedCursor = cursorSchema.safeParse(cursorValue);
  if (!parsedCursor.success) {
    return Response.json({ error: "Invalid audit stream cursor." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const listener = postgres(databaseUrl, { max: 1 });
  let cursor = parsedCursor.data;
  let closed = false;
  let flushing: Promise<void> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let subscription: Awaited<ReturnType<typeof listener.listen>> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (value: string) => {
        if (!closed) controller.enqueue(encoder.encode(value));
      };
      const flush = async () => {
        if (flushing) return flushing;
        flushing = (async () => {
          while (!closed) {
            const events = await getAdminRuntime().listAuditEvents({
              afterId: cursor,
              limit: 200,
            });
            for (const event of events) {
              send(
                `id: ${event.id}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`,
              );
              cursor = event.id;
            }
            if (events.length < 200) break;
          }
        })().finally(() => {
          flushing = undefined;
        });
        return flushing;
      };
      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        await subscription?.unlisten().catch(() => undefined);
        await listener.end().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // The client may already have closed its side of the stream.
        }
      };

      request.signal.addEventListener("abort", () => void cleanup(), {
        once: true,
      });
      try {
        subscription = await listener.listen(AUDIT_EVENT_CHANNEL, () => {
          void flush().catch(() => void cleanup());
        });
        send("retry: 3000\n\n");
        await flush();
        heartbeat = setInterval(() => send(": heartbeat\n\n"), 15_000);
        heartbeat.unref?.();
      } catch {
        await cleanup();
      }
    },
    async cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      await subscription?.unlisten().catch(() => undefined);
      await listener.end().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
