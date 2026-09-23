import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AudioMetadata {
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
}

function isInside(childPath: string, parentPath: string): boolean {
  const rel = path.relative(parentPath, childPath);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function probeAudio(filePath: string): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "format=duration:stream=duration,bit_rate,sample_rate,channels",
      "-of",
      "json",
      filePath,
    ]);

    let stdout = "";
    let stderr = "";

    ffprobe.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    ffprobe.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffprobe.on("error", (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
    });

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const stream = data.streams?.[0] || {};
        const format = data.format || {};

        const duration = parseFloat(stream.duration || format.duration || "0");
        const bitrate = parseInt(stream.bit_rate || format.bit_rate || "0", 10);
        const sampleRate = parseInt(stream.sample_rate || "0", 10);
        const channels = parseInt(stream.channels || "0", 10);

        resolve({ duration, bitrate, sampleRate, channels });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`Failed to parse ffprobe output: ${message}`));
      }
    });
  });
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on("error", (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim()));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let masterFileArg: string | undefined;
  let slugArg: string | undefined;
  let forceFlag = false;

  for (const arg of args) {
    if (arg === "--force") {
      forceFlag = true;
    } else if (arg.startsWith("-")) {
      console.error(`Error: Unrecognized option "${arg}".`);
      process.exit(1);
    } else if (!masterFileArg) {
      masterFileArg = arg;
    } else if (!slugArg) {
      slugArg = arg;
    } else {
      console.error(`Error: Unexpected argument "${arg}".`);
      process.exit(1);
    }
  }

  if (!masterFileArg || !slugArg) {
    console.error("Error: Usage: npm run tools:preview-gen -- <master-file> <slug> [--force]");
    process.exit(1);
  }

  const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!SLUG_REGEX.test(slugArg)) {
    console.error(`Error: Invalid slug "${slugArg}". Slug must match ^[a-z0-9]+(-[a-z0-9]+)*$.`);
    process.exit(1);
  }

  const rawMastersDir = process.env.MASTERS_DIR;
  if (!rawMastersDir) {
    console.error("Error: MASTERS_DIR environment variable is not set.");
    process.exit(2);
  }

  if (!fs.existsSync(rawMastersDir)) {
    console.error(`Error: MASTERS_DIR directory does not exist: ${rawMastersDir}`);
    process.exit(2);
  }

  const repoRoot = path.resolve(__dirname, "..");
  const repoRealPath = fs.realpathSync.native(repoRoot);
  const mastersRealPath = fs.realpathSync.native(rawMastersDir);

  if (isInside(mastersRealPath, repoRealPath) || mastersRealPath === repoRealPath) {
    console.error(`Error: MASTERS_DIR must not resolve inside the repository: ${mastersRealPath}`);
    process.exit(2);
  }

  const candidateMasterPath = path.resolve(mastersRealPath, masterFileArg);
  if (!fs.existsSync(candidateMasterPath)) {
    console.error(`Error: Master file does not exist: ${candidateMasterPath}`);
    process.exit(3);
  }

  let masterRealPath: string;
  try {
    masterRealPath = fs.realpathSync.native(candidateMasterPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Master file does not exist: ${message}`);
    process.exit(3);
  }

  if (!isInside(masterRealPath, mastersRealPath) && masterRealPath !== mastersRealPath) {
    console.error(`Error: Master file resolves outside MASTERS_DIR: ${masterRealPath}`);
    process.exit(3);
  }

  const masterStat = fs.statSync(masterRealPath);
  if (!masterStat.isFile()) {
    console.error(`Error: Master file does not exist: ${masterRealPath}`);
    process.exit(3);
  }

  const previewsDir = path.resolve(repoRealPath, "public", "audio", "previews");
  if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir, { recursive: true });
  }

  const finalOutputPath = path.join(previewsDir, `${slugArg}.mp3`);
  if (fs.existsSync(finalOutputPath) && !forceFlag) {
    console.error(`Error: Preview file already exists: public/audio/previews/${slugArg}.mp3. Use --force to overwrite.`);
    process.exit(4);
  }

  const tagPath = path.resolve(repoRealPath, "assets", "watermark", "tag.wav");
  if (!fs.existsSync(tagPath)) {
    console.error("Error: Watermark tag file not found: assets/watermark/tag.wav");
    process.exit(5);
  }
  const tagRealPath = fs.realpathSync.native(tagPath);

  const randSuffix = Math.random().toString(36).slice(2, 8);
  const tempOutputPath = path.join(previewsDir, `.tmp-${slugArg}-${Date.now()}-${randSuffix}.mp3`);

  let tempFileToClean: string | null = tempOutputPath;
  const cleanupTemp = () => {
    if (tempFileToClean && fs.existsSync(tempFileToClean)) {
      try {
        fs.unlinkSync(tempFileToClean);
      } catch {
        // ignore
      }
    }
  };

  process.on("SIGINT", () => {
    cleanupTemp();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanupTemp();
    process.exit(143);
  });

  try {
    let masterMeta: AudioMetadata;
    let tagMeta: AudioMetadata;

    try {
      [masterMeta, tagMeta] = await Promise.all([
        probeAudio(masterRealPath),
        probeAudio(tagRealPath),
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: FFmpeg execution failed: ${message}`);
      cleanupTemp();
      process.exit(6);
    }

    const D = masterMeta.duration;
    const tagDuration = tagMeta.duration > 0 ? tagMeta.duration : 2.0;

    const INTERVAL = 25;
    const FIRST_TAG_OFFSET = 10;
    const offsets: number[] = [];

    if (D <= INTERVAL) {
      const t0 = Math.max(0, (D - tagDuration) / 2);
      offsets.push(t0);
    } else {
      let t = FIRST_TAG_OFFSET;
      while (t < D) {
        offsets.push(t);
        t += INTERVAL;
      }
      if (offsets.length === 0) {
        offsets.push(0);
      }
    }

    let filterGraph = "";
    if (offsets.length === 1) {
      const d0 = Math.round(offsets[0] * 1000);
      filterGraph = `[0:a]aformat=channel_layouts=stereo:sample_rates=44100[music];[1:a]aformat=channel_layouts=stereo:sample_rates=44100,volume=-12dB,adelay=${d0}|${d0}[wm];[music][wm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.891:level=disabled[out]`;
    } else {
      const N = offsets.length;
      const splitOutputs = offsets.map((_, i) => `[t${i}]`).join("");
      const delayedOutputs = offsets
        .map((off, i) => `[t${i}]adelay=${Math.round(off * 1000)}|${Math.round(off * 1000)}[t${i}d]`)
        .join(";");
      const mixedInputs = offsets.map((_, i) => `[t${i}d]`).join("");

      filterGraph = `[0:a]aformat=channel_layouts=stereo:sample_rates=44100[music];[1:a]aformat=channel_layouts=stereo:sample_rates=44100,volume=-12dB[tag];[tag]asplit=${N}${splitOutputs};${delayedOutputs};${mixedInputs}amix=inputs=${N}:duration=longest:dropout_transition=0:normalize=0[wm];[music][wm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.891:level=disabled[out]`;
    }

    const ffmpegArgs = [
      "-y",
      "-v",
      "error",
      "-i",
      masterRealPath,
      "-i",
      tagRealPath,
      "-filter_complex",
      filterGraph,
      "-map",
      "[out]",
      "-map_metadata",
      "-1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      tempOutputPath,
    ];

    try {
      await runFfmpeg(ffmpegArgs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: FFmpeg execution failed: ${message}`);
      cleanupTemp();
      process.exit(6);
    }

    fs.renameSync(tempOutputPath, finalOutputPath);
    tempFileToClean = null;

    let finalMeta: AudioMetadata;
    try {
      finalMeta = await probeAudio(finalOutputPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: FFmpeg execution failed: ${message}`);
      process.exit(6);
    }

    const durationSeconds = Math.round(finalMeta.duration);
    const outputRel = `public/audio/previews/${slugArg}.mp3`;

    console.log(
      JSON.stringify({
        slug: slugArg,
        output: outputRel,
        durationSeconds,
        bitrate: finalMeta.bitrate,
        sampleRate: finalMeta.sampleRate,
        channels: finalMeta.channels,
      })
    );

    process.exit(0);
  } catch (err: unknown) {
    cleanupTemp();
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: FFmpeg execution failed: ${message}`);
    process.exit(6);
  }
}

void main();
