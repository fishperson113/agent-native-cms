import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { createDatabase } from "../../src/infrastructure/database/client";

function databaseName(connectionString: string): string {
  const name = new URL(connectionString).pathname.replace(/^\//, "");
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("Integration database name contains unsupported characters.");
  }
  return name;
}

export async function setup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Integration DATABASE_URL is required.");

  const targetName = databaseName(connectionString);
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    const existing = await admin<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${targetName}) as exists
    `;
    if (!existing[0]?.exists) {
      await admin.unsafe(`CREATE DATABASE "${targetName}"`);
    }
  } finally {
    await admin.end();
  }

  const database = createDatabase(connectionString);
  try {
    await migrate(database.db, { migrationsFolder: "drizzle" });
  } finally {
    await database.close();
  }
}
