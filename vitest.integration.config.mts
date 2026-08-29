import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Separate from vitest.config.mts: these tests hit the real local Postgres
// instance (npm run db:start) and no database mocks, per docs/ARCHITECTURE.md.
// Kept out of the default `test`/`test:run` include pattern so unit tests
// stay fast and don't require Supabase to be running.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
