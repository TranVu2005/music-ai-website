# Task 003: Audio Preview Generator Utility Implementation Plan

> Status: Approved with changes on 2026-09-23 by Lead review.

## 1. Files

### Files to Create
- `docs/plans/003-preview-generator.md` — Approved implementation plan committed first.
- `tools/generate-preview.ts` — CLI preview generator utility resolving master files relative to `MASTERS_DIR`, mixing periodic watermarks, and producing 128 kbps 44.1 kHz stereo MP3 previews.
- `assets/watermark/tag.wav` — Synthesized 2.0 s placeholder watermark tone (WAV PCM 16-bit, 44.1 kHz stereo) conforming to `tools/check-audio.sh` allowlist and size limits.
- `test/tools/preview-generator.test.ts` — Vitest automated test suite covering stream properties, watermark positioning via `silencedetect`, short master handling, peak limiting, and rejection error cases.

### Files to Modify
- `package.json` — Add script `"tools:preview-gen": "tsx tools/generate-preview.ts"`. (No new dependencies; `tsx` is already in `devDependencies`).
- `.gitignore` — Add `public/audio/previews/.tmp-*` pattern so ephemeral preview generator temp files are ignored.
- `.env.example` — Document `MASTERS_DIR` environment variable with example paths outside the repository.
- `.github/workflows/ci.yml` — Add an `Ensure FFmpeg` step in the `checks` job to verify/install `ffmpeg` and `ffprobe` on the GitHub Actions runner.
- `README.md` — Document `MASTERS_DIR` configuration, `npm run tools:preview-gen` CLI usage, and the FFmpeg command used to generate `assets/watermark/tag.wav`.
- `CHANGELOG.md` — Add release entry for Task 003.
- `docs/status.md` — Update Task 003 status row to "In review (PR #N)".

### Files to Delete
- None.

---

## 2. Technical Specification

### CLI Contract
- **Invocation**:
  ```bash
  npm run tools:preview-gen -- <master-file> <slug> [--force]
  ```
- **Arguments**:
  - `<master-file>`: Path to uncompressed master audio file, resolved strictly relative to `MASTERS_DIR`.
  - `<slug>`: Track slug matching `^[a-z0-9]+(-[a-z0-9]+)*$`. Output is written to `public/audio/previews/<slug>.mp3`.
  - `--force`: Optional flag allowing overwriting an existing preview MP3 file.
- **Exit Codes and Error Messages** (written to `stderr`):
  - `0`: Success (stdout prints single JSON line).
  - `1`: Argument / Usage error:
    - Missing arguments: `Error: Usage: npm run tools:preview-gen -- <master-file> <slug> [--force]`
    - Invalid slug format: `Error: Invalid slug "<slug>". Slug must match ^[a-z0-9]+(-[a-z0-9]+)*$.`
    - Unrecognized option: `Error: Unrecognized option "<opt>".`
  - `2`: Environment configuration error:
    - `MASTERS_DIR` unset: `Error: MASTERS_DIR environment variable is not set.`
    - `MASTERS_DIR` does not exist: `Error: MASTERS_DIR directory does not exist: <path>`
    - `MASTERS_DIR` inside repository: `Error: MASTERS_DIR must not resolve inside the repository: <path>`
  - `3`: Input master file error:
    - Master resolves outside `MASTERS_DIR`: `Error: Master file resolves outside MASTERS_DIR: <path>`
    - Master file not found: `Error: Master file does not exist: <path>`
  - `4`: Output destination error:
    - Target preview exists without `--force`: `Error: Preview file already exists: public/audio/previews/<slug>.mp3. Use --force to overwrite.`
  - `5`: Watermark asset error:
    - Watermark missing: `Error: Watermark tag file not found: assets/watermark/tag.wav`
  - `6`: FFmpeg / ffprobe runtime error:
    - Execution failure: `Error: FFmpeg execution failed: <stderr>`
- **Standard Output (stdout)**:
  - On exit code `0`, prints strictly one JSON line with ffprobe-extracted stream attributes:
    ```json
    {"slug":"dem-dong-ha-noi","output":"public/audio/previews/dem-dong-ha-noi.mp3","durationSeconds":145,"bitrate":128000,"sampleRate":44100,"channels":2}
    ```
  - No database writes are performed (metadata is output for admin review/copying). All diagnostic logs go to `stderr`.

### Watermark Schedule
- **Fixed Interval Constant**: `INTERVAL = 25` seconds (strictly within required 20–30 s range).
- **First-Tag Offset**: `FIRST_TAG_OFFSET = 10` seconds.
- **Tag Duration**: 2.0 seconds (extracted dynamically from `assets/watermark/tag.wav`).
- **Scheduling Algorithm**:
  1. Determine master audio duration `D` via `ffprobe`.
  2. If `D <= INTERVAL`:
     - Place single tag centered or at offset: `t_0 = Math.max(0, (D - tagDuration) / 2)`. If `D < tagDuration`, `t_0 = 0`.
     - Ensures every master shorter than the interval receives at least one tag.
  3. If `D > INTERVAL`:
     - First tag timestamp: `t_0 = FIRST_TAG_OFFSET` (10 s).
     - Successive tags: `t_k = t_{k-1} + INTERVAL` (10 s, 35 s, 60 s, 85 s, ...) while `t_k < D`.
     - For a 65 s master: tags placed at 10 s, 35 s, 60 s (exactly 3 tags, consecutive gap = 25 s).

### Watermark Level, Limiting & Music Volume Preservation
- **Preservation of Music Level**:
  - FFmpeg's `amix` filter defaults to `normalize=1`, which divides all input streams by $1/N$ (lowering volume by -6 dB for 2 inputs).
  - We explicitly configure `normalize=0`:
    ```
    amix=inputs=2:duration=first:dropout_transition=0:normalize=0
    ```
  - `normalize=0` sums audio samples without downscaling, preserving the music's original dynamic range and loudness during unwatermarked passages.
- **Peak Limiting to Prevent Clipping**:
  - Because `normalize=0` sums master music and watermark signals directly, summing a near-full-scale master (e.g. -0.1 dBFS) and a watermark at -15 dBFS will exceed 0 dBFS and cause digital clipping (clipping distortion).
  - To prevent clipping while keeping music untouched during silent watermark periods, we append an audio limiter filter immediately following `amix`:
    ```
    ,alimiter=limit=0.891:level=disabled[out]
    ```
    `limit=0.891` corresponds to -1.0 dBFS ceiling ($10^{-1/20} \approx 0.89125$), guaranteeing that the mixed output never exceeds -1.0 dBFS and produces zero full-scale clipped samples even during loud musical peaks.
- **Watermark Attenuation**:
  - The watermark stream is attenuated using `volume=-12dB`.
  - With `assets/watermark/tag.wav` peaking around -3 dBFS, a -12 dB attenuation brings watermark peaks to approximately -15 dBFS.
  - This ensures the voice tag is clearly audible over the music to deter unauthorized commercial use, while remaining balanced within the mix.

### Output Encoding
- **Codec**: `libmp3lame`
- **Bitrate**: CBR 128 kbps (`-b:a 128k`)
- **Sampling Rate**: 44.1 kHz (`-ar 44100` and `sample_rates=44100`)
- **Channels**: Stereo 2 channels (`channel_layouts=stereo` in `aformat`, which automatically upmixes mono master tracks to dual identical channels L/R).
- **Metadata Scrubbing**:
  - Add `-map_metadata -1` to prevent any master file metadata tags (artist, copyright, proprietary comments) from leaking into public previews.

### Exact FFmpeg Filter Graph & Command Line
The preview generator executes FFmpeg via `child_process.spawn("ffmpeg", args)` with an argument array (no shell string):

```bash
ffmpeg -y -v error -i <masterPath> -i <tagPath> -filter_complex <filterGraph> -map "[out]" -map_metadata -1 -c:a libmp3lame -b:a 128k <tempOutputPath>
```

Where `<filterGraph>` is constructed dynamically based on $N$ scheduled tag offsets $d_0, d_1, \dots, d_{N-1}$ (in milliseconds):

**Case $N = 1$:**
```
[0:a]aformat=channel_layouts=stereo:sample_rates=44100[music];
[1:a]aformat=channel_layouts=stereo:sample_rates=44100,volume=-12dB,adelay=d0|d0[wm];
[music][wm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.891:level=disabled[out]
```

**Case $N > 1$:**
```
[0:a]aformat=channel_layouts=stereo:sample_rates=44100[music];
[1:a]aformat=channel_layouts=stereo:sample_rates=44100,volume=-12dB[tag];
[tag]asplit=N[t0][t1]...[t{N-1}];
[t0]adelay=d0|d0[t0d];
[t1]adelay=d1|d1[t1d];
...
[t{N-1}]adelay=d_{N-1}|d_{N-1}[t{N-1}d];
[t0d][t1d]...[t{N-1}d]amix=inputs=N:duration=longest:dropout_transition=0:normalize=0[wm];
[music][wm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.891:level=disabled[out]
```

### Generation of `assets/watermark/tag.wav`
- **Audio Format**: Uncompressed WAV PCM 16-bit (`pcm_s16le`), 44.1 kHz stereo, 2.0 s duration, ~353 KB file size.
- **Generation Command**:
  ```bash
  ffmpeg -y -f lavfi -i "sine=frequency=880:sample_rate=44100:duration=2" -af "volume=8,afade=t=in:st=0:d=0.05,afade=t=out:st=1.5:d=0.5" -c:a pcm_s16le -ar 44100 -ac 2 assets/watermark/tag.wav
  ```
- Complies strictly with `.gitignore` and `tools/check-audio.sh` allowlist (`assets/watermark/*`, max 15 MB).
- Documented in `README.md`.

---

## 3. Safety & Validation Constraints

1. **`MASTERS_DIR` Containment & Existence**:
   - Check if `process.env.MASTERS_DIR` is set.
   - Verify directory exists via `fs.existsSync`.
   - Resolve canonical path via `fs.realpathSync.native(mastersDir)` and compare against `fs.realpathSync.native(repoRoot)`.
   - Containment check helper:
     ```typescript
     function isInside(child: string, parent: string): boolean {
       const rel = path.relative(parent, child);
       return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
     }
     ```
   - If `isInside(mastersRealPath, repoRealPath)` or `mastersRealPath === repoRealPath`, exit with code 2.
2. **Master File Path Traversal & Symlinks**:
   - Resolve master file path: `path.resolve(mastersRealPath, masterFile)`.
   - Verify file existence via `fs.existsSync`.
   - Resolve canonical realpath via `fs.realpathSync.native(targetMasterPath)`.
   - If `!isInside(targetMasterRealPath, mastersRealPath)` and `targetMasterRealPath !== mastersRealPath`, reject traversal or symlink escape with exit code 3.
3. **Slug Validation**:
   - Enforce regex: `/^[a-z0-9]+(-[a-z0-9]+)*$/`. Rejects uppercase letters, leading/trailing hyphens, consecutive hyphens, spaces, and path separators.
4. **Atomic Output Writing via Temp File & Signal Handlers**:
   - Write output to temporary file `public/audio/previews/.tmp-<slug>-<random>.mp3` on the same directory/mount to ensure atomic `fs.renameSync` without `EXDEV` errors.
   - Register process signal handlers for `SIGINT` and `SIGTERM` as well as `process.on("exit")` and `try/finally` blocks to remove any unrenamed `.tmp-*` file upon interruption or failure.
   - `.gitignore` explicitly ignores `public/audio/previews/.tmp-*`.
5. **Overwrite Protection**:
   - If `public/audio/previews/<slug>.mp3` already exists and `--force` is not provided, exit with code 4.
6. **Cross-Platform Child Process Execution**:
   - Invoke `ffmpeg` and `ffprobe` via `child_process.spawn` with an argument array `string[]` and `shell: false`.

---

## 4. Tests (`test/tools/preview-generator.test.ts`)

### Vitest CI and Skip Logic
```typescript
import { execSync } from "node:child_process";

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
```

### Test Configuration & Isolation
- **Per-Test Timeout**: 60 seconds (`{ timeout: 60000 }`) on all FFmpeg integration tests.
- **Test Slugs**: All test slugs strictly prefixed with `test-003-` (e.g. `test-003-sine-65`, `test-003-silent-65`, `test-003-short-8`, `test-003-limiter`).
- **Placeholder Integrity**: Before the test suite runs, compute and store MD5 hashes of all 5 committed placeholder MP3s (`public/audio/previews/*.mp3`). In `afterAll`, assert all 5 MD5 hashes are identical.
- **Working Tree Cleanliness**: In `afterEach` and `afterAll`, remove any `public/audio/previews/test-003-*.mp3` and any `.tmp-*` files, as well as the external temp `MASTERS_DIR`. Compare before/after snapshots of `public/audio/previews/` files to ensure zero stray files remain.

### Test Cases
1. **Sine Input (~65 s)**:
   - Generate synthetic 65 s sine master in a temporary `MASTERS_DIR` (outside repo).
   - Run preview generator.
   - Probe output file with `ffprobe`:
     - `codec_name === 'mp3'`
     - `sample_rate === '44100'`
     - `channels === 2`
     - `bit_rate` is 128 kbps ±5% (121,600 to 134,400 bps)
     - `duration` matches source within 1.0 s tolerance.
2. **Watermark Position on Silent Master (~65 s)**:
   - Generate 65 s silent master (`anullsrc=r=44100:cl=stereo:duration=65`) in temp `MASTERS_DIR`.
   - Run preview generator.
   - Run `ffmpeg -i <output> -af "silencedetect=noise=-50dB:d=0.5" -f null -`.
   - Parse non-silent segments:
     - Verify exactly 3 watermark tags are detected.
     - Verify start times are at ~10 s, ~35 s, ~60 s.
     - Verify consecutive gaps between tag starts are $25 \pm 1.0$ s (strictly within 20–30 s).
3. **Short Master (< Interval)**:
   - Generate 8 s sine master in temp `MASTERS_DIR`.
   - Run preview generator.
   - Verify output is generated successfully and contains at least one watermark tag.
4. **Limiter & Clipping Prevention**:
   - Generate 20 s sine master peaking at -0.1 dBFS (`volume=0.9885`).
   - Run preview generator (which overlays watermark at 10 s).
   - Probe output using `ffmpeg -i <output> -af "astats" -f null -`.
   - Assert `Peak level dB` < 0 dBFS (specifically $\le -0.9$ dBFS due to `alimiter=limit=0.891`), proving zero full-scale clipped samples around the watermark tag.
5. **Rejection & Error Handling**:
   - Path traversal attempt (e.g. `../../secret.wav`) -> exit code 3.
   - Master outside `MASTERS_DIR` via symlink:
     - On Linux: `fs.symlinkSync(outsideMaster, insideLink)`.
     - On Windows (win32): create directory junction via `fs.symlinkSync(outsideDir, insideJunction, "junction")`. If creation throws `EPERM`, skip that single test case with a clear diagnostic message.
     - Generator rejects with exit code 3.
   - `MASTERS_DIR` located inside repository -> exit code 2.
   - Invalid slug (e.g. `Track_01`, `slug..bad`, `-slug`) -> exit code 1.
   - Existing output file without `--force` -> exit code 4; with `--force` -> overwrites successfully (exit code 0).

---

## 5. CI Pipeline Integration

- In `.github/workflows/ci.yml`, add an `Ensure FFmpeg` step in the `checks` job before running tests:
  ```yaml
  - name: Ensure FFmpeg
    run: |
      if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y ffmpeg
      fi
      ffmpeg -version | head -1
      ffprobe -version | head -1
  ```
- `build/deploy/Dockerfile` already installs `ffmpeg` (which provides `ffmpeg` and `ffprobe` in Alpine) in `base`, which is inherited by `runner`. Verified that no Dockerfile modification is needed.

---

## 6. Deviations

**None.** All requirements, constraints, and architecture rules are strictly implemented as specified.

---

## 7. Risks / Open Questions

1. **Silence detection threshold**: Background MP3 encoding noise floor is around -60 dBFS; `silencedetect=noise=-50dB:d=0.5` reliably identifies the -15 dBFS watermark tag segments without noise interference.
2. **Atomic rename across mounts**: Creating the temporary MP3 in `public/audio/previews/` ensures the temp file and target file reside on the same filesystem, guaranteeing atomic rename without cross-device errors (`EXDEV`).
