import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, TrackStatus } from "@prisma/client";
import { seed, sampleTracks } from "../../src/db/seed";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  if (process.env.CI === "true") {
    throw new Error(
      "DATABASE_URL is missing in CI environment. Database tests must not be skipped in CI."
    );
  }
}

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("Database Seed Verification & Idempotency", () => {
  let prisma: PrismaClient;
  const projectRoot = path.resolve(__dirname, "../..");

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("seeds 5 sample tracks with valid metadata and existing preview files", async () => {
    // First seed execution
    await seed();

    const tracks = await prisma.track.findMany({
      orderBy: { slug: "asc" },
    });

    expect(tracks).toHaveLength(5);

    // Verify all tracks are published
    for (const track of tracks) {
      expect(track.status).toBe(TrackStatus.published);
      expect(track.previewFileUrl).toMatch(/^\/audio\/previews\/[a-z0-9-]+\.mp3$/);
      expect(track.originalFileKey).toBeNull();
      expect(track.bpm).toBeGreaterThan(0);
      expect(track.durationSeconds).toBeGreaterThan(0);

      // Review Change 5: assert that preview_file_url resolves to an existing file in public/
      const relativePath = track.previewFileUrl.replace(/^\//, "");
      const fullFilePath = path.join(projectRoot, "public", relativePath);
      expect(
        fs.existsSync(fullFilePath),
        `Expected preview file to exist at ${fullFilePath}`
      ).toBe(true);

      const fileStats = fs.statSync(fullFilePath);
      expect(fileStats.size).toBeGreaterThan(0);
      expect(fileStats.size).toBeLessThan(100 * 1024); // well under 100 KB
    }

    // Verify distinct slugs, genres, and moods
    const slugs = new Set(tracks.map((t) => t.slug));
    expect(slugs.size).toBe(5);

    const genreMoodPairs = new Set(tracks.map((t) => `${t.genre}|${t.mood}`));
    expect(genreMoodPairs.size).toBe(5);
  });

  it("is completely idempotent when executed a second time", async () => {
    // Capture state before second run
    const beforeTracks = await prisma.track.findMany({
      orderBy: { slug: "asc" },
    });
    expect(beforeTracks).toHaveLength(5);

    // Second seed execution
    await seed();

    // Verify state after second run
    const afterTracks = await prisma.track.findMany({
      orderBy: { slug: "asc" },
    });
    expect(afterTracks).toHaveLength(5);

    for (let i = 0; i < beforeTracks.length; i++) {
      const before = beforeTracks[i];
      const after = afterTracks[i];

      expect(after.id).toBe(before.id);
      expect(after.slug).toBe(before.slug);
      expect(after.createdAt.getTime()).toBe(before.createdAt.getTime());
      expect(after.status).toBe(before.status);
    }
  });
});
