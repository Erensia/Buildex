import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// Points drizzle-kit at TEST_DATABASE_URL instead of DATABASE_URL, so
// `pnpm db:test:migrate` can apply the same migrations to an isolated
// database used only by integration tests.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.TEST_DATABASE_URL ?? "" },
});
