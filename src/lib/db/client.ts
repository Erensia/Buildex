import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb(connectionString: string) {
  return drizzle(postgres(connectionString, { max: 10 }), { schema });
}

const globalForDb = globalThis as typeof globalThis & {
  __buildexDb?: ReturnType<typeof createDb>;
};

export function getDb() {
  if (globalForDb.__buildexDb) return globalForDb.__buildexDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  globalForDb.__buildexDb = createDb(connectionString);
  return globalForDb.__buildexDb;
}
