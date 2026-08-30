import { randomUUID } from "node:crypto";

import type { CmsMcpToolName } from "./contract";

export type CmsMcpTelemetryEvent = {
  event: "cms_mcp_tool_call";
  correlationId: string;
  contractVersion: string;
  toolName: CmsMcpToolName;
  tenantId: string;
  articleId?: string;
  presentationId?: string;
  durationMs: number;
  compileDurationMs?: number;
  resultState: string;
  artifactHash?: string;
  errorCode?: string;
};

export interface CmsMcpObserver {
  record(event: CmsMcpTelemetryEvent): void;
}

export class NoopCmsMcpObserver implements CmsMcpObserver {
  record(): void {}
}

export class JsonStderrCmsMcpObserver implements CmsMcpObserver {
  record(event: CmsMcpTelemetryEvent): void {
    console.error(JSON.stringify(event));
  }
}

export function generateCorrelationId(): string {
  return randomUUID();
}
