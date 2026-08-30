import { z } from "zod";

const mcpEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//, "DATABASE_URL must be a PostgreSQL URL"),
  CMS_TENANT_ID: z.string().uuid(),
  CMS_MCP_STDIO_API_KEY: z.string().min(16).optional(),
});

export type McpEnvironment = z.infer<typeof mcpEnvironmentSchema>;

export function parseMcpEnvironment(
  input: Record<string, string | undefined>,
): McpEnvironment {
  return mcpEnvironmentSchema.parse(input);
}
