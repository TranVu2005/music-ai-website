# Task 003: Audio Preview Generator Utility

## 1. Objectives
- Implement an automated audio processing development utility script in `tools/` that converts uncompressed master audio files into watermarked MP3 preview tracks for web and mobile streaming.
- Produce 128 kbps, 44.1 kHz stereo MP3 files output directly to `public/audio/previews/<slug>.mp3`.
- Mix in a periodic voice-tag audio watermark from `assets/watermark/` repeating every 20 to 30 seconds throughout the preview track per `docs/architecture/file-protection.md`.
- Read lossless master audio files from an external `MASTERS_DIR` path specified via environment variable, ensuring zero master audio files are committed to the repository.
- Ensure FFmpeg and necessary audio codecs are installed and functional inside the project Docker container image (`build/deploy/Dockerfile`).

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [File Protection](../architecture/file-protection.md)
- [CLAUDE.md](../../CLAUDE.md)
- [Task 001: Project Setup](./001-project-setup.md)

## 3. Scope
- Components, directories, and files within task scope:
  - `tools/generate-preview.ts` (or `tools/generate-preview.sh` / `tools/generate-preview.js`): CLI utility accepting a master audio file path and track slug, calling FFmpeg with audio filter graphs to mix the voice tag into the preview.
  - `assets/watermark/`: Store the default voice-tag watermark sample file (exempt from repository audio ignore rules).
  - `build/deploy/Dockerfile`: Update Docker packaging to include FFmpeg and required media libraries (`ffmpeg`, `ffprobe`).
  - `.env.example`: Document the `MASTERS_DIR` environment variable configuration pointing to external master storage.
  - `test/tools/preview-generator.test.ts`: Automated test suite for audio generation and validation.
- Explicitly Out of Scope:
  - Do NOT commit lossless master audio files (`*.wav`, `*.flac`) to the repository or place them in `public/`.
  - Do NOT implement S3 / Cloudflare R2 direct bucket upload pipelines (deferred to Phase 2).
  - Do NOT build an administrative web upload interface (Phase 1 runs as a local script / worker).

## 4. Definition of Done
- [ ] Preview generation script is functional and callable via CLI (`npm run tools:preview-gen` or equivalent).
- [ ] Converts input master audio into 128 kbps 44.1 kHz stereo MP3 output at `public/audio/previews/<slug>.mp3`.
- [ ] Watermark voice tag from `assets/watermark/` is mixed into the audio track repeated periodically every 20-30 seconds.
- [ ] Master audio files are read strictly from `MASTERS_DIR` outside the Git repository.
- [ ] Docker image in `build/deploy/Dockerfile` builds with FFmpeg and ffprobe available on the PATH.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Integration test using synthetic sine wave audio input generated via FFmpeg:
  - Verify output file exists at target preview path and is valid MP3.
  - Use `ffprobe` to assert audio stream properties: bitrate is 128 kbps (+/- 5%) and sample rate is 44.1 kHz stereo.
  - Assert total duration matches source audio within a 1-second tolerance.
  - Assert watermark presence at the expected periodic intervals (every 20-30 seconds).
