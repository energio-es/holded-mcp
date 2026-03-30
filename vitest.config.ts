import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/tests/**/*.test.ts"],
    coverage: {
      include: [
        "src/schemas/**/*.ts",
        "src/services/**/*.ts",
        "src/tools/**/*.ts",
      ],
      reporter: ["text", "lcov", "html"],
    },
  },
});
