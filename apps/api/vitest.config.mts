import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
