// Creates the database referenced by TEST_DATABASE_URL if it doesn't exist yet.
// Safe to run repeatedly (e.g. before every `pnpm test:integration:setup`).
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is not set in .env.local. Add it before running integration tests.");
  process.exit(1);
}

const parsed = new URL(testDatabaseUrl);
const databaseName = parsed.pathname.replace(/^\//, "");
if (!databaseName) {
  console.error(`TEST_DATABASE_URL must include a database name: ${testDatabaseUrl}`);
  process.exit(1);
}

// Connect to the default "postgres" maintenance database to run CREATE DATABASE.
const adminUrl = new URL(testDatabaseUrl);
adminUrl.pathname = "/postgres";
const sql = postgres(adminUrl.toString(), { max: 1 });

try {
  await sql.unsafe(`CREATE DATABASE "${databaseName}"`);
  console.log(`Created database "${databaseName}".`);
} catch (error) {
  // 42P04 = duplicate_database
  if (error && typeof error === "object" && "code" in error && error.code === "42P04") {
    console.log(`Database "${databaseName}" already exists, skipping.`);
  } else {
    throw error;
  }
} finally {
  await sql.end();
}
