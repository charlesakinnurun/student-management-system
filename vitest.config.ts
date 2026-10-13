import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests run against a disposable SQLite database (`prisma/test.db`) that is
 * created and reset in global setup. File-level parallelism is disabled because
 * they share a single database file.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret-please-change-min-32-characters-000",
      JWT_EXPIRES_IN: "15m",
      REFRESH_TOKEN_EXPIRES_IN: "7d",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
