import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // Integration tests (src/**/*.integration.test.ts) need a real Postgres
  // database and run separately via `pnpm test:integration`; keep the
  // default `pnpm test` DB-free so it can run anywhere without setup.
  test: { include: ["src/**/*.test.ts"], exclude: ["**/node_modules/**", "**/*.integration.test.ts"] },
});
