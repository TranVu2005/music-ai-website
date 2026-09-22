import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
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
