import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Configuration and repository structure", () => {
  const rootDir = path.resolve(__dirname, "..");

  it("next.config has output: 'standalone'", () => {
    const configPath = fs.existsSync(path.join(rootDir, "next.config.ts"))
      ? path.join(rootDir, "next.config.ts")
      : path.join(rootDir, "next.config.js");
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toMatch(/output:\s*["']standalone["']/);
  });

  it("src/db/schema.prisma contains directUrl", () => {
    const schemaPath = path.join(rootDir, "src/db/schema.prisma");
    expect(fs.existsSync(schemaPath)).toBe(true);
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain('directUrl = env("DIRECT_URL")');
  });

  it("required repository files exist", () => {
    const requiredFiles = [
      ".env.example",
      "build/deploy/Dockerfile",
      ".dockerignore",
      "public/audio/previews/.gitkeep",
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath), `Expected ${relPath} to exist`).toBe(true);
    }
  });
});
