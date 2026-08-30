import { randomUUID } from "node:crypto";

import type {
  EventId,
  EventStore,
  StreamId,
} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

type StoredMcpEvent = {
  eventId: EventId;
  streamId: StreamId;
  message: JSONRPCMessage;
};

export class InMemoryMcpEventStore implements EventStore {
  private readonly events: StoredMcpEvent[] = [];
  private readonly streamsByEventId = new Map<EventId, StreamId>();
  private sequence = 0;

  async storeEvent(
    streamId: StreamId,
    message: JSONRPCMessage,
  ): Promise<EventId> {
    this.sequence += 1;
    const eventId = `${this.sequence}-${randomUUID()}`;
    this.events.push({ eventId, streamId, message });
    this.streamsByEventId.set(eventId, streamId);
    return eventId;
  }

  async getStreamIdForEventId(
    eventId: EventId,
  ): Promise<StreamId | undefined> {
    return this.streamsByEventId.get(eventId);
  }

  async replayEventsAfter(
    lastEventId: EventId,
    options: {
      send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>;
    },
  ): Promise<StreamId> {
    const streamId = this.streamsByEventId.get(lastEventId);
    if (!streamId) return "";

    const cursor = this.events.findIndex(
      (event) => event.eventId === lastEventId,
    );
    if (cursor < 0) return "";

    for (const event of this.events.slice(cursor + 1)) {
      if (event.streamId === streamId) {
        await options.send(event.eventId, event.message);
      }
    }
    return streamId;
  }
}
