import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabase } from "@/infrastructure/database/client";
import { AUDIT_EVENT_CHANNEL } from "@/modules/audit/audit-event";
import { DrizzleAuditEventStore } from "@/modules/audit/drizzle-audit-event-store";

const connectionString = process.env.DATABASE_URL!;
const database = createDatabase(connectionString);
const store = new DrizzleAuditEventStore(database.db);

afterAll(async () => {
  await database.close();
});

describe("durable audit event stream", () => {
  it("keeps cursor pagination stable while new rows are appended", async () => {
    const correlationId = randomUUID();
    const first = await store.append({
      eventType: "test.cursor.v1",
      actorRole: "system",
      correlationId,
      outcome: "success",
    });
    const second = await store.append({
      eventType: "test.cursor.v1",
      actorRole: "system",
      correlationId,
      outcome: "success",
    });
    const pageOne = await store.list({ correlationId, limit: 2 });
    const third = await store.append({
      eventType: "test.cursor.v1",
      actorRole: "system",
      correlationId,
      outcome: "success",
    });
    const pageTwo = await store.list({
      correlationId,
      afterId: pageOne.at(-1)!.id,
      limit: 2,
    });

    expect(pageOne.map((event) => event.id)).toEqual([first.id, second.id]);
    expect(pageTwo.map((event) => event.id)).toEqual([third.id]);
  });

  it("uses LISTEN/NOTIFY only to wake consumers for canonical rows", async () => {
    const listener = postgres(connectionString, { max: 1 });
    let resolveNotification!: (value: string) => void;
    const notification = new Promise<string>((resolve) => {
      resolveNotification = resolve;
    });
    const subscription = await listener.listen(
      AUDIT_EVENT_CHANNEL,
      resolveNotification,
    );
    try {
      const appended = await store.append({
        eventType: "test.notification.v1",
        actorRole: "system",
        outcome: "success",
      });
      await expect(notification).resolves.toBe(String(appended.id));
      await expect(store.list({ afterId: appended.id - 1, limit: 1 })).resolves
        .toContainEqual(appended);
    } finally {
      await subscription.unlisten();
      await listener.end();
    }
  });
});
