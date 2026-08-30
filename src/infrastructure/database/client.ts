import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString, { max: 5 });
  const db = drizzle(client, { schema });

  return {
    client,
    db,
    async close() {
      await client.end();
    },
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
export type DatabaseExecutor = Database | DatabaseTransaction;
