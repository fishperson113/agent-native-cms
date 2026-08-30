import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env", quiet: true });

function integrationDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL or TEST_DATABASE_URL is required.");
  }
  const url = new URL(process.env.DATABASE_URL);
  const developmentName = url.pathname.replace(/^\//, "");
  url.pathname = `/${developmentName}_test`;
  return url.toString();
}

process.env.DATABASE_URL = integrationDatabaseUrl();

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/support/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/support/integration-global-setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
