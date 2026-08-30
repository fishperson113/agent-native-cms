import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { parseEnvironment } from "@/infrastructure/config/environment";

import { createDatabase } from "./client";

config({ path: ".env" });

const environment = parseEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);

try {
  await migrate(database.db, { migrationsFolder: "drizzle" });
  console.info("Database migrations completed.");
} finally {
  await database.close();
}
