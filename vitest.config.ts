import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    exclude: [
      ...configDefaults.exclude,
      ".agent/**",
      ".claude/**",
      ".gemini/**",
      ".next/**",
      "build/**",
    ],
  },
});
