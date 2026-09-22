import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".agent/**",
      ".claude/**",
      ".gemini/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
