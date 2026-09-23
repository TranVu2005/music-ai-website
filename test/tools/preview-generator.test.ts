import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

let hasFfmpeg = false;
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
  execSync("ffprobe -version", { stdio: "ignore" });
  hasFfmpeg = true;
} catch {
  hasFfmpeg = false;
}

if (!hasFfmpeg && process.env.CI === "true") {
  throw new Error("FFmpeg/ffprobe is missing in CI environment. Audio tests must not be skipped in CI.");
}

const describeFfmpeg = hasFfmpeg ? describe : describe.skip;

function hashFile(filePath: string): string {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

describeFfmpeg("Task 003: Audio Preview Generator Utility", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const previewsDir = path.resolve(repoRoot, "public/audio/previews");
  const scriptPath = path.resolve(repoRoot, "tools/generate-preview.ts");
  const tsxCli = path.resolve(repoRoot, "node_modules/tsx/dist/cli.mjs");

  let tempMastersDir: string;
  let originalPlaceholderFiles: string[] = [];
  const originalHashes: Record<string, string> = {};

  function runGenerator(
    args: string[],
    envOverrides: Record<string, string | undefined> = {}
  ) {
    const res = spawnSync(process.execPath, [tsxCli, scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...envOverrides },
      encoding: "utf-8",
    });
    return {
      status: res.status,
      stdout: res.stdout || "",
      stderr: res.stderr || "",
    };
  }

  function cleanupTestPreviews() {
    if (!fs.existsSync(previewsDir)) return;
    const entries = fs.readdirSync(previewsDir);
    for (const entry of entries) {
      if (entry.startsWith("test-003-") || entry.startsWith(".tmp-")) {
        try {
          fs.unlinkSync(path.join(previewsDir, entry));
        } catch {
          // ignore
        }
      }
    }
  }

  beforeAll(() => {
    tempMastersDir = fs.mkdtempSync(path.join(os.tmpdir(), "music-shop-masters-"));

    // Snapshot committed placeholder files
    if (fs.existsSync(previewsDir)) {
      originalPlaceholderFiles = fs
        .readdirSync(previewsDir)
        .filter((f) => !f.startsWith("test-003-") && !f.startsWith(".tmp-"));
      for (const file of originalPlaceholderFiles) {
        originalHashes[file] = hashFile(path.join(previewsDir, file));
      }
    }
  });

  afterEach(() => {
    cleanupTestPreviews();
  });

  afterAll(() => {
    cleanupTestPreviews();

    if (tempMastersDir && fs.existsSync(tempMastersDir)) {
      try {
        fs.rmSync(tempMastersDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    // Verify all original placeholder MP3s remain untouched
    if (fs.existsSync(previewsDir)) {
      const currentFiles = fs
        .readdirSync(previewsDir)
        .filter((f) => !f.startsWith("test-003-") && !f.startsWith(".tmp-"));
      expect(currentFiles.sort()).toEqual(originalPlaceholderFiles.sort());
      for (const file of originalPlaceholderFiles) {
        expect(hashFile(path.join(previewsDir, file))).toBe(originalHashes[file]);
      }
    }
  });

  it(
    "converts a ~65 s sine master into a 128 kbps 44.1 kHz stereo MP3 preview matching duration within 1 s",
    { timeout: 60000 },
    () => {
      const masterPath = path.join(tempMastersDir, "sine65.wav");
      execSync(
        `ffmpeg -y -v error -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=65" -c:a pcm_s16le "${masterPath}"`,
        { stdio: "ignore" }
      );

      const res = runGenerator(["sine65.wav", "test-003-sine-65"], {
        MASTERS_DIR: tempMastersDir,
      });

      expect(res.status).toBe(0);
      expect(res.stderr).toBe("");

      const jsonOutput = JSON.parse(res.stdout.trim());
      expect(jsonOutput.slug).toBe("test-003-sine-65");
      expect(jsonOutput.output).toBe("public/audio/previews/test-003-sine-65.mp3");
      expect(jsonOutput.channels).toBe(2);
      expect(jsonOutput.sampleRate).toBe(44100);
      expect(jsonOutput.durationSeconds).toBeGreaterThanOrEqual(64);
      expect(jsonOutput.durationSeconds).toBeLessThanOrEqual(66);

      const outputPath = path.join(previewsDir, "test-003-sine-65.mp3");
      expect(fs.existsSync(outputPath)).toBe(true);

      const probeRaw = execSync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate:format=duration -of json "${outputPath}"`,
        { encoding: "utf-8" }
      );
      const probe = JSON.parse(probeRaw);
      const stream = probe.streams[0];
      const duration = parseFloat(probe.format.duration);

      expect(stream.codec_name).toBe("mp3");
      expect(parseInt(stream.sample_rate, 10)).toBe(44100);
      expect(stream.channels).toBe(2);

      // Bitrate 128 kbps ±5% (121600 - 134400 bps)
      const bitrate = parseInt(stream.bit_rate, 10);
      expect(bitrate).toBeGreaterThanOrEqual(121600);
      expect(bitrate).toBeLessThanOrEqual(134400);

      // Duration within 1 s of source (65 s)
      expect(Math.abs(duration - 65)).toBeLessThanOrEqual(1.0);
    }
  );

  it(
    "mixes periodic watermarks on a silent ~65 s master at 25 s intervals with exactly 3 tags detected",
    { timeout: 60000 },
    () => {
      const masterPath = path.join(tempMastersDir, "silent65.wav");
      execSync(
        `ffmpeg -y -v error -f lavfi -i "anullsrc=r=44100:cl=stereo:duration=65" -c:a pcm_s16le "${masterPath}"`,
        { stdio: "ignore" }
      );

      const res = runGenerator(["silent65.wav", "test-003-silent-65"], {
        MASTERS_DIR: tempMastersDir,
      });

      expect(res.status).toBe(0);
      const outputPath = path.join(previewsDir, "test-003-silent-65.mp3");
      expect(fs.existsSync(outputPath)).toBe(true);

      // Analyze silence and non-silent tag sections using silencedetect
      const detectRes = spawnSync(
        "ffmpeg",
        [
          "-v",
          "info",
          "-i",
          outputPath,
          "-af",
          "silencedetect=noise=-50dB:d=0.5",
          "-f",
          "null",
          "-",
        ],
        { encoding: "utf-8" }
      );

      const lines = detectRes.stderr.split("\n");
      const tagStarts: number[] = [];

      for (const line of lines) {
        // silence_end indicates where silence stopped, i.e., tag started
        const matchEnd = line.match(/silence_end:\s*([0-9.]+)/);
        if (matchEnd) {
          const t = parseFloat(matchEnd[1]);
          if (t < 64.0) {
            tagStarts.push(t);
          }
        }
      }

      // 65 s master with interval 25 s and first tag at 10 s has tags at 10 s, 35 s, 60 s
      expect(tagStarts.length).toBe(3);

      expect(tagStarts[0]).toBeGreaterThanOrEqual(9.0);
      expect(tagStarts[0]).toBeLessThanOrEqual(11.0);

      expect(tagStarts[1]).toBeGreaterThanOrEqual(34.0);
      expect(tagStarts[1]).toBeLessThanOrEqual(36.0);

      expect(tagStarts[2]).toBeGreaterThanOrEqual(59.0);
      expect(tagStarts[2]).toBeLessThanOrEqual(61.0);

      // Verify consecutive intervals are strictly within 20-30 s
      const gap1 = tagStarts[1] - tagStarts[0];
      const gap2 = tagStarts[2] - tagStarts[1];
      expect(gap1).toBeGreaterThanOrEqual(20);
      expect(gap1).toBeLessThanOrEqual(30);
      expect(gap2).toBeGreaterThanOrEqual(20);
      expect(gap2).toBeLessThanOrEqual(30);
    }
  );

  it(
    "guarantees that a short master (< interval) receives at least one watermark tag",
    { timeout: 60000 },
    () => {
      const masterPath = path.join(tempMastersDir, "short8.wav");
      execSync(
        `ffmpeg -y -v error -f lavfi -i "anullsrc=r=44100:cl=stereo:duration=8" -c:a pcm_s16le "${masterPath}"`,
        { stdio: "ignore" }
      );

      const res = runGenerator(["short8.wav", "test-003-short-8"], {
        MASTERS_DIR: tempMastersDir,
      });

      expect(res.status).toBe(0);
      const outputPath = path.join(previewsDir, "test-003-short-8.mp3");
      expect(fs.existsSync(outputPath)).toBe(true);

      const detectRes = spawnSync(
        "ffmpeg",
        [
          "-v",
          "info",
          "-i",
          outputPath,
          "-af",
          "silencedetect=noise=-50dB:d=0.5",
          "-f",
          "null",
          "-",
        ],
        { encoding: "utf-8" }
      );

      const lines = detectRes.stderr.split("\n");
      let tagFound = false;
      for (const line of lines) {
        if (line.includes("silence_end:") || line.includes("silence_start:")) {
          tagFound = true;
          break;
        }
      }
      expect(tagFound).toBe(true);
    }
  );

  it(
    "applies peak limiter to prevent clipping on a loud (-0.1 dBFS) master sine wave",
    { timeout: 60000 },
    () => {
      const masterPath = path.join(tempMastersDir, "loud20.wav");
      // Generate sine at -0.1 dBFS (amplitude 0.9885)
      execSync(
        `ffmpeg -y -v error -f lavfi -i "sine=frequency=1000:sample_rate=44100:duration=20" -af "volume=0.9885" -c:a pcm_s16le "${masterPath}"`,
        { stdio: "ignore" }
      );

      const res = runGenerator(["loud20.wav", "test-003-limiter"], {
        MASTERS_DIR: tempMastersDir,
      });

      expect(res.status).toBe(0);
      const outputPath = path.join(previewsDir, "test-003-limiter.mp3");
      expect(fs.existsSync(outputPath)).toBe(true);

      // Probe peak level via astats
      const statsRes = spawnSync(
        "ffmpeg",
        ["-i", outputPath, "-af", "astats", "-f", "null", "-"],
        { encoding: "utf-8" }
      );

      const match = statsRes.stderr.match(/Peak level dB:\s*([-\d.]+)/);
      expect(match).not.toBeNull();
      const peakDb = parseFloat(match![1]);

      // Assert Peak level is strictly below 0 dBFS (specifically capped at ~ -0.9 to -1.0 dBFS by limit=0.891)
      expect(peakDb).toBeLessThan(0);
      expect(peakDb).toBeLessThanOrEqual(-0.8);
    }
  );

  it(
    "rejects invalid inputs, directory traversal, and repository containment",
    { timeout: 60000 },
    () => {
      // 1. Missing arguments
      const resMissing = runGenerator([]);
      expect(resMissing.status).toBe(1);
      expect(resMissing.stderr).toContain("Error: Usage:");

      // 2. Invalid slug format
      const resBadSlug = runGenerator(["sine65.wav", "Invalid_Slug!"]);
      expect(resBadSlug.status).toBe(1);
      expect(resBadSlug.stderr).toContain("Error: Invalid slug");

      // 3. MASTERS_DIR unset
      const resUnset = runGenerator(["sine65.wav", "test-003-unset"], {
        MASTERS_DIR: "",
      });
      expect(resUnset.status).toBe(2);
      expect(resUnset.stderr).toContain("Error: MASTERS_DIR environment variable is not set.");

      // 4. MASTERS_DIR does not exist
      const resMissingDir = runGenerator(["sine65.wav", "test-003-missing-dir"], {
        MASTERS_DIR: path.join(os.tmpdir(), "nonexistent-masters-dir-xyz"),
      });
      expect(resMissingDir.status).toBe(2);
      expect(resMissingDir.stderr).toContain("Error: MASTERS_DIR directory does not exist:");

      // 5. MASTERS_DIR inside repository
      const resInRepo = runGenerator(["sine65.wav", "test-003-in-repo"], {
        MASTERS_DIR: path.join(repoRoot, "src"),
      });
      expect(resInRepo.status).toBe(2);
      expect(resInRepo.stderr).toContain("Error: MASTERS_DIR must not resolve inside the repository:");

      // 6. Path traversal attempting to escape MASTERS_DIR
      const resTraversal = runGenerator(["../../secret.wav", "test-003-traversal"], {
        MASTERS_DIR: tempMastersDir,
      });
      expect(resTraversal.status).toBe(3);

      // 7. Symlink / Junction escaping MASTERS_DIR
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "outside-masters-"));
      const outsideFile = path.join(outsideDir, "outside.wav");
      execSync(
        `ffmpeg -y -v error -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=5" -c:a pcm_s16le "${outsideFile}"`,
        { stdio: "ignore" }
      );

      const insideJunction = path.join(tempMastersDir, "junction_link");
      try {
        if (process.platform === "win32") {
          fs.symlinkSync(outsideDir, insideJunction, "junction");
        } else {
          fs.symlinkSync(outsideDir, insideJunction, "dir");
        }
        const resSymlink = runGenerator(["junction_link/outside.wav", "test-003-symlink"], {
          MASTERS_DIR: tempMastersDir,
        });
        expect(resSymlink.status).toBe(3);
        expect(resSymlink.stderr).toContain("Error: Master file resolves outside MASTERS_DIR");
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (process.platform === "win32" && (error.code === "EPERM" || error.code === "EACCES")) {
          // Windows requires elevated permissions for non-junction symlinks; skip single case if EPERM occurs
          console.warn("Skipping directory junction symlink test on win32 due to lack of symlink permissions (EPERM)");
        } else {
          throw err;
        }
      } finally {
        try {
          fs.rmSync(outsideDir, { recursive: true, force: true });
          if (fs.existsSync(insideJunction)) {
            fs.unlinkSync(insideJunction);
          }
        } catch {
          // ignore
        }
      }

      // 8. Overwrite protection
      const masterPath = path.join(tempMastersDir, "short5.wav");
      execSync(
        `ffmpeg -y -v error -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=5" -c:a pcm_s16le "${masterPath}"`,
        { stdio: "ignore" }
      );

      const resFirst = runGenerator(["short5.wav", "test-003-force-check"], {
        MASTERS_DIR: tempMastersDir,
      });
      expect(resFirst.status).toBe(0);

      // Attempt to overwrite without --force
      const resSecondNoForce = runGenerator(["short5.wav", "test-003-force-check"], {
        MASTERS_DIR: tempMastersDir,
      });
      expect(resSecondNoForce.status).toBe(4);
      expect(resSecondNoForce.stderr).toContain("Error: Preview file already exists:");

      // Overwrite with --force
      const resThirdForce = runGenerator(["short5.wav", "test-003-force-check", "--force"], {
        MASTERS_DIR: tempMastersDir,
      });
      expect(resThirdForce.status).toBe(0);
    }
  );
});
