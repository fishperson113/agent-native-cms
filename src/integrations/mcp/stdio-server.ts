import { config } from "dotenv";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createCmsMcpKernel } from "@/infrastructure/composition/create-cms-mcp-kernel";
import { createMcpAccessServices } from "@/infrastructure/composition/create-mcp-access-services";
import { createDatabase } from "@/infrastructure/database/client";

import { parseMcpEnvironment } from "./mcp-environment";
import { JsonStderrCmsMcpObserver } from "./observability";

config({ path: ".env", quiet: true });

const environment = parseMcpEnvironment(process.env);
if (!environment.CMS_MCP_STDIO_API_KEY) {
  throw new Error("CMS_MCP_STDIO_API_KEY is required for stdio MCP.");
}
const database = createDatabase(environment.DATABASE_URL);
const authentication = await createMcpAccessServices(
  database.db,
).authenticateCredential.execute(environment.CMS_MCP_STDIO_API_KEY);
if (
  authentication.outcome !== "authenticated" ||
  authentication.actor.role !== "tenant"
) {
  await database.close();
  throw new Error("Stdio MCP requires an active tenant credential.");
}
const server = createCmsMcpKernel({
  db: database.db,
  tenantId: authentication.actor.tenantId,
  observer: new JsonStderrCmsMcpObserver(),
});

async function shutdown(): Promise<void> {
  await server.close();
  await database.close();
}

process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

await server.connect(new StdioServerTransport());
