import { PrismaClient, TrackStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backfillSearchText } from "../../tools/backfill-search-text";
import { buildTrackSearchText } from "../../src/lib/search/normalize";

if (!process.env.DATABASE_URL && process.env.CI === "true") {
  throw new Error("DATABASE_URL is missing in CI environment. Database tests must not be skipped in CI.");
}

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("Search text backfill", () => {
  const prisma = new PrismaClient();
  const slugs = ["test-004b-backfill-empty", "test-004b-backfill-stale"];

  async function cleanup() {
    await prisma.track.deleteMany({ where: { slug: { in: slugs } } });
  }

  beforeAll(async () => {
    await cleanup();
    await backfillSearchText(prisma);
  });
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("fills empty values, corrects stale non-empty values, and updates zero rows on a second run", async () => {
    await prisma.track.createMany({
      data: [
        {
          slug: slugs[0],
          title: "Đêm Đông",
          description: "Tiếng sáo",
          searchText: "",
          genre: "Test",
          mood: "Test",
          durationSeconds: 100,
          previewFileUrl: "/audio/previews/test.mp3",
          status: TrackStatus.draft,
        },
        {
          slug: slugs[1],
          title: "Ðêm Sài Gòn",
          description: null,
          searchText: "old value",
          genre: "Test",
          mood: "Test",
          durationSeconds: 100,
          previewFileUrl: "/audio/previews/test.mp3",
          status: TrackStatus.draft,
        },
      ],
    });

    const first = await backfillSearchText(prisma);
    expect(first.scanned).toBeGreaterThanOrEqual(2);
    expect(first.updated).toBe(2);

    const rows = await prisma.track.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, title: true, description: true, searchText: true },
    });
    for (const row of rows) {
      expect(row.searchText).toBe(buildTrackSearchText(row.title, row.description));
    }

    const second = await backfillSearchText(prisma);
    expect(second.scanned).toBe(first.scanned);
    expect(second.updated).toBe(0);
  });
});
