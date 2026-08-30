import { z } from "zod";

const httpMcpEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//, "DATABASE_URL must be a PostgreSQL URL"),
  CMS_MCP_SESSION_IDLE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(86_400_000)
    .default(1_800_000),
  CMS_MCP_MAX_SESSIONS: z.coerce.number().int().min(1).max(10_000).default(100),
  CMS_MCP_ALLOWED_ORIGINS: z.string().default("*"),
});

export type HttpMcpEnvironment = z.infer<typeof httpMcpEnvironmentSchema>;

export function parseHttpMcpEnvironment(
  input: Record<string, string | undefined>,
): HttpMcpEnvironment {
  return httpMcpEnvironmentSchema.parse(input);
}
