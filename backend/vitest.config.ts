import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.*",
        "src/server.ts",
        "src/app.ts",
        "src/test/setup.ts",
        "**/*.test.ts",
        "src/lib/observability/metrics/index.ts",
        "src/lib/observability/usageAnalytics/index.ts",
        "src/middleware/rateLimit/index.ts",
        "src/lib/di/container.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
