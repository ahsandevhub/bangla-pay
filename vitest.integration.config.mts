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
    // These files all share one mutable local Postgres instance -- Vitest's
    // default is to run separate test *files* in parallel, which let
    // kyc.test.ts's dynamically-seeded fake_nid_records rows still be
    // present when schema.test.ts's fixture-count assertion ran
    // concurrently. Sequential files trade some wall-clock time for
    // correctness here, since nothing about this suite is safe to run
    // file-parallel against shared, mutable state.
    fileParallelism: false,
  },
});
