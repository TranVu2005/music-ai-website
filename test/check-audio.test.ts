import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function getShPath(): string {
  if (process.platform !== "win32") {
    return "sh";
  }
  const candidates = [
    "C:\\Program Files\\Git\\bin\\sh.exe",
    "C:\\Program Files\\Git\\usr\\bin\\sh.exe",
    "C:\\Program Files (x86)\\Git\\bin\\sh.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "sh";
}

describe("tools/check-audio.sh audio guard", () => {
  const rootDir = path.resolve(__dirname, "..");
  const scriptPath = path.join(rootDir, "tools", "check-audio.sh");
  let tempDir: string;
  const shCmd = getShPath();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "music-shop-audio-guard-"));
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: "ignore" });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  });

  it("rejects forbidden audio file at root (foo.wav)", () => {
    fs.writeFileSync(path.join(tempDir, "foo.wav"), "dummy audio");
    execSync("git add foo.wav", { cwd: tempDir });

    const result = spawnSync(shCmd, [scriptPath], {
      cwd: tempDir,
      encoding: "utf-8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr || result.stdout).toContain("foo.wav");
  });

  it("rejects files larger than 15 MB", () => {
    const bigFile = path.join(tempDir, "bigfile.dat");
    // 15MB + 1 byte
    const size = 15 * 1024 * 1024 + 1;
    const fd = fs.openSync(bigFile, "w");
    fs.writeSync(fd, Buffer.alloc(1024), 0, 1024, size - 1024);
    fs.closeSync(fd);

    execSync("git add bigfile.dat", { cwd: tempDir });

    const result = spawnSync(shCmd, [scriptPath], {
      cwd: tempDir,
      encoding: "utf-8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr || result.stdout).toContain("bigfile.dat");
  });

  it("accepts audio files in allowed locations (public/audio/previews/x.mp3)", () => {
    const previewDir = path.join(tempDir, "public", "audio", "previews");
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, "x.mp3"), "preview mp3 data");

    const watermarkDir = path.join(tempDir, "assets", "watermark");
    fs.mkdirSync(watermarkDir, { recursive: true });
    fs.writeFileSync(path.join(watermarkDir, "tag.wav"), "watermark wav data");

    execSync("git add .", { cwd: tempDir });

    const result = spawnSync(shCmd, [scriptPath], {
      cwd: tempDir,
      encoding: "utf-8",
    });

    expect(result.status).toBe(0);
  });

  it("supports --staged flag to check git diff --cached", () => {
    fs.writeFileSync(path.join(tempDir, "staged.mp3"), "unapproved mp3");
    // not added to git yet -> script --staged should pass
    let result = spawnSync(shCmd, [scriptPath, "--staged"], {
      cwd: tempDir,
      encoding: "utf-8",
    });
    expect(result.status).toBe(0);

    // stage it -> script --staged should fail
    execSync("git add staged.mp3", { cwd: tempDir });
    result = spawnSync(shCmd, [scriptPath, "--staged"], {
      cwd: tempDir,
      encoding: "utf-8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr || result.stdout).toContain("staged.mp3");
  });
});
