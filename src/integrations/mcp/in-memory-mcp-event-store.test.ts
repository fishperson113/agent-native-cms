import { describe, expect, it, vi } from "vitest";

import { InMemoryMcpEventStore } from "./in-memory-mcp-event-store";

describe("InMemoryMcpEventStore", () => {
  it("replays only later events from the same stream", async () => {
    const store = new InMemoryMcpEventStore();
    const first = await store.storeEvent("stream-a", {
      jsonrpc: "2.0",
      method: "notifications/message",
    });
    await store.storeEvent("stream-b", {
      jsonrpc: "2.0",
      method: "notifications/other",
    });
    const last = await store.storeEvent("stream-a", {
      jsonrpc: "2.0",
      method: "notifications/updated",
    });
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(store.replayEventsAfter(first, { send })).resolves.toBe(
      "stream-a",
    );
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(
      last,
      expect.objectContaining({ method: "notifications/updated" }),
    );
  });

  it("returns an empty stream for an unknown cursor", async () => {
    const store = new InMemoryMcpEventStore();
    await expect(
      store.replayEventsAfter("missing", { send: vi.fn() }),
    ).resolves.toBe("");
  });
});
