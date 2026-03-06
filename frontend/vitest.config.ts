import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/setupTests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      exclude: ["node_modules/", "dist/", "**/*.config.*", "src/main.tsx", "**/*.test.{ts,tsx}", "**/*.d.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
