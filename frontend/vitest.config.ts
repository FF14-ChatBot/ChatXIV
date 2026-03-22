import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["tests/setupTests.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.*",
        "src/main.tsx",
        /** Re-exports ThemeProvider/useTheme from src/theme */
        "src/hooks/useTheme.ts",
        /** Entire tests tree: specs, setup, mocks — not product code */
        "tests/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "src/**/index.ts",
        /** Shared test helpers co-located under src */
        "src/test-utils.tsx",
        /** CSS Modules are styling only; line coverage is not meaningful here */
        "**/*.module.css",
        /** Binary assets skew per-file coverage */
        "**/*.{png,jpg,jpeg,gif,webp,svg,ico}",
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
