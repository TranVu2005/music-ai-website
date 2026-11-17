import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    // Node is the default environment (API/DB tests). Component tests opt in to jsdom
    // per file with a `// @vitest-environment jsdom` docblock.
    setupFiles: ["./test/components/setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      ".agents/**",
      ".claude/**",
      ".gemini/**",
      ".next/**",
      "build/**",
    ],
  },
});
