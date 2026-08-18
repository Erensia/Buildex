import { defineConfig } from "vitest/config";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

// Separate from vitest.config.ts on purpose: `pnpm test` must stay fast and
// DB-free. Integration tests run against TEST_DATABASE_URL only, via
// `pnpm test:integration` (after `pnpm test:integration:setup`).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["src/**/*.integration.test.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
    testTimeout: 20000,
  },
});
