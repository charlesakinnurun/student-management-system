import { execSync } from "node:child_process";

/**
 * Create a clean SQLite schema for the test run. Prisma resolves the relative
 * `file:./test.db` path against the schema directory (prisma/), matching what
 * the application sees at runtime.
 */
export default function setup() {
  execSync("npx prisma db push --skip-generate --force-reset", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./test.db",
    },
  });
}
