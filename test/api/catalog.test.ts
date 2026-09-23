import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient, TrackStatus } from "@prisma/client";
import { GET as getTracks } from "../../src/app/api/tracks/route";
import { GET as getTrackBySlug } from "../../src/app/api/tracks/[slug]/route";
import { GET as getFilters } from "../../src/app/api/filters/route";
import {
  sanitizeTrack,
  createErrorResponse,
  FORBIDDEN_KEYS,
} from "../../src/lib/api/serialization";

// Unit tests for serialization and sanitization logic (runs without database)
describe("Catalog API - Unit & Serialization Tests", () => {
  it("sanitizeTrack strips all forbidden keys", () => {
    const rawTrack = {
      id: "test-id",
      title: "Test Track",
      slug: "test-track",
      description: "Description",
      genre: "Pop",
      mood: "Happy",
      bpm: 120,
      durationSeconds: 180,
      previewFileUrl: "/audio/previews/test.mp3",
      coverImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Forbidden fields:
      originalFileKey: "masters/secret.wav",
      original_file_key: "masters/secret2.wav",
      status: "draft",
      reservedUntil: new Date(),
      reserved_until: new Date(),
      reservedByOrderId: "order-123",
      reserved_by_order_id: "order-123",
    };

    const sanitized = sanitizeTrack(rawTrack);

    for (const forbidden of FORBIDDEN_KEYS) {
      expect(sanitized).not.toHaveProperty(forbidden);
    }
    expect(sanitized.id).toBe("test-id");
    expect(sanitized.title).toBe("Test Track");
    expect(sanitized.bpm).toBe(120);
  });

  it("createErrorResponse produces expected error envelope and status", async () => {
    const res = createErrorResponse("BAD_REQUEST", "Invalid input", 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid input",
      },
    });
  });
});

// DB Test Guard: skip locally if DATABASE_URL is not set, hard-fail in CI
if (!process.env.DATABASE_URL) {
  if (process.env.CI === "true") {
    throw new Error(
      "DATABASE_URL is missing in CI environment. Database tests must not be skipped in CI."
    );
  }
}

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("Catalog REST API Integration Tests", () => {
  let prisma: PrismaClient;

  // Helper to recursively assert that no forbidden keys appear in any JSON response
  function assertNoForbiddenKeys(obj: unknown, path = ""): void {
    if (obj === null || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
      return;
    }

    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const currentPath = path ? `${path}.${key}` : key;
      expect(
        FORBIDDEN_KEYS.has(key),
        `Forbidden key '${key}' detected at path '${currentPath}'`
      ).toBe(false);

      assertNoForbiddenKeys(record[key], currentPath);
    }
  }

  // Cleanup all test fixtures with prefix "test-004-"
  async function cleanupTestFixtures() {
    await prisma.track.deleteMany({
      where: {
        slug: {
          startsWith: "test-004-",
        },
      },
    });
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestFixtures();
  });

  afterEach(async () => {
    await cleanupTestFixtures();
  });

  afterAll(async () => {
    await cleanupTestFixtures();
    await prisma.$disconnect();
  });

  describe("GET /api/tracks - Pagination & Ordering", () => {
    it("returns default pagination with 5 seeded tracks and totalPages = 1", async () => {
      const req = new Request("http://localhost:3000/api/tracks");
      const res = await getTracks(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("total", 5);
      expect(data).toHaveProperty("page", 1);
      expect(data).toHaveProperty("limit", 10);
      expect(data).toHaveProperty("totalPages", 1);
      expect(data.items).toHaveLength(5);

      assertNoForbiddenKeys(data);
    });

    it("supports custom page and limit pagination", async () => {
      const req = new Request("http://localhost:3000/api/tracks?page=2&limit=2");
      const res = await getTracks(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.page).toBe(2);
      expect(data.limit).toBe(2);
      expect(data.total).toBe(5);
      expect(data.totalPages).toBe(3);
      expect(data.items).toHaveLength(2);
    });

    it("orders results by createdAt desc and id asc tiebreaker", async () => {
      const req = new Request("http://localhost:3000/api/tracks?limit=10");
      const res = await getTracks(req);
      const data = await res.json();

      for (let i = 0; i < data.items.length - 1; i++) {
        const current = data.items[i];
        const next = data.items[i + 1];
        const currentTime = new Date(current.createdAt).getTime();
        const nextTime = new Date(next.createdAt).getTime();

        if (currentTime === nextTime) {
          expect(current.id.localeCompare(next.id)).toBeLessThanOrEqual(0);
        } else {
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }
    });

    it("clamps limit > 50 to 50", async () => {
      const req = new Request("http://localhost:3000/api/tracks?limit=1000");
      const res = await getTracks(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.limit).toBe(50);
      expect(data.items).toHaveLength(5);
    });

    it("returns HTTP 400 for non-integer or invalid page parameter", async () => {
      const invalidPages = ["abc", "0", "-5", "1.5", ""];
      for (const p of invalidPages) {
        const req = new Request(`http://localhost:3000/api/tracks?page=${p}`);
        const res = await getTracks(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid 'page' parameter: must be a positive integer",
          },
        });
      }
    });

    it("returns HTTP 400 for non-integer or invalid limit parameter", async () => {
      const invalidLimits = ["abc", "0", "-10", "2.5", ""];
      for (const l of invalidLimits) {
        const req = new Request(`http://localhost:3000/api/tracks?limit=${l}`);
        const res = await getTracks(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid 'limit' parameter: must be a positive integer",
          },
        });
      }
    });

    it("returns empty items array for page beyond totalPages", async () => {
      const req = new Request("http://localhost:3000/api/tracks?page=999");
      const res = await getTracks(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toEqual([]);
      expect(data.total).toBe(5);
      expect(data.page).toBe(999);
      expect(data.totalPages).toBe(1);
    });
  });

  describe("GET /api/tracks - Filtering & Search", () => {
    it("excludes non-published tracks (draft, archived, reserved, sold_exclusive)", async () => {
      // Create non-published tracks with test-004- prefix
      await prisma.track.createMany({
        data: [
          {
            slug: "test-004-draft",
            title: "Draft Track",
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.draft,
          },
          {
            slug: "test-004-archived",
            title: "Archived Track",
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.archived,
          },
          {
            slug: "test-004-reserved",
            title: "Reserved Track",
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.reserved,
          },
          {
            slug: "test-004-sold-exclusive",
            title: "Sold Exclusive Track",
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.sold_exclusive,
          },
        ],
      });

      const req = new Request("http://localhost:3000/api/tracks?limit=50");
      const res = await getTracks(req);
      const data = await res.json();

      expect(data.total).toBe(5);
      const slugs = data.items.map((t: { slug: string }) => t.slug);
      expect(slugs).not.toContain("test-004-draft");
      expect(slugs).not.toContain("test-004-archived");
      expect(slugs).not.toContain("test-004-reserved");
      expect(slugs).not.toContain("test-004-sold-exclusive");
    });

    it("searches q case-insensitively across title and description", async () => {
      // Case-insensitive title match
      const req1 = new Request("http://localhost:3000/api/tracks?q=sai%20gon");
      const res1 = await getTracks(req1);
      const data1 = await res1.json();
      expect(data1.items).toHaveLength(1);
      expect(data1.items[0].slug).toBe("nang-sai-gon");

      const req2 = new Request("http://localhost:3000/api/tracks?q=SAI%20GON");
      const res2 = await getTracks(req2);
      const data2 = await res2.json();
      expect(data2.items).toHaveLength(1);
      expect(data2.items[0].slug).toBe("nang-sai-gon");

      // Description match: "tiếng sáo" is in Khoảng Lặng Tây Nguyên
      const req3 = new Request("http://localhost:3000/api/tracks?q=tiếng%20sáo");
      const res3 = await getTracks(req3);
      const data3 = await res3.json();
      expect(data3.items).toHaveLength(1);
      expect(data3.items[0].slug).toBe("khoang-lang-tay-nguyen");
    });

    it("treats empty or whitespace q as no filter", async () => {
      const req = new Request("http://localhost:3000/api/tracks?q=%20%20%20");
      const res = await getTracks(req);
      const data = await res.json();
      expect(data.total).toBe(5);
    });

    it("escapes SQL wildcards (% and _) so they do not match everything", async () => {
      // Searching % should NOT match all 5 tracks; it should only match tracks containing literal %
      const reqPercent = new Request("http://localhost:3000/api/tracks?q=%25");
      const resPercent = await getTracks(reqPercent);
      const dataPercent = await resPercent.json();
      expect(dataPercent.items).toHaveLength(0);
      expect(dataPercent.total).toBe(0);

      // Searching _ should NOT match all 5 tracks
      const reqUnderscore = new Request("http://localhost:3000/api/tracks?q=_");
      const resUnderscore = await getTracks(reqUnderscore);
      const dataUnderscore = await resUnderscore.json();
      expect(dataUnderscore.items).toHaveLength(0);
      expect(dataUnderscore.total).toBe(0);

      // Verify that a track with literal % in title IS matched
      await prisma.track.create({
        data: {
          slug: "test-004-literal-percent",
          title: "Track with 100% Volume",
          genre: "Lo-fi Chill",
          mood: "Relaxing",
          durationSeconds: 100,
          previewFileUrl: "/audio/previews/test.mp3",
          status: TrackStatus.published,
        },
      });

      const reqPercentMatch = new Request("http://localhost:3000/api/tracks?q=%25");
      const resPercentMatch = await getTracks(reqPercentMatch);
      const dataPercentMatch = await resPercentMatch.json();
      expect(dataPercentMatch.items).toHaveLength(1);
      expect(dataPercentMatch.items[0].slug).toBe("test-004-literal-percent");
    });

    it("filters by genre and mood", async () => {
      const reqGenre = new Request("http://localhost:3000/api/tracks?genre=Lo-fi%20Chill");
      const resGenre = await getTracks(reqGenre);
      const dataGenre = await resGenre.json();
      expect(dataGenre.items).toHaveLength(1);
      expect(dataGenre.items[0].slug).toBe("dem-dong-ha-noi");

      const reqMood = new Request("http://localhost:3000/api/tracks?mood=Energetic");
      const resMood = await getTracks(reqMood);
      const dataMood = await resMood.json();
      expect(dataMood.items).toHaveLength(1);
      expect(dataMood.items[0].slug).toBe("nhip-song-pho-thi");
    });

    it("returns empty result for unknown genre or mood", async () => {
      const reqUnknown = new Request(
        "http://localhost:3000/api/tracks?genre=NonExistent&mood=NonExistent"
      );
      const resUnknown = await getTracks(reqUnknown);
      expect(resUnknown.status).toBe(200);
      const dataUnknown = await resUnknown.json();
      expect(dataUnknown.items).toEqual([]);
      expect(dataUnknown.total).toBe(0);
      expect(dataUnknown.totalPages).toBe(0);
    });

    it("ignores bpm query parameter without filtering or erroring", async () => {
      const reqBpm = new Request("http://localhost:3000/api/tracks?bpm=78");
      const resBpm = await getTracks(reqBpm);
      expect(resBpm.status).toBe(200);
      const dataBpm = await resBpm.json();
      // Returns all 5 tracks because bpm=78 has no filtering effect
      expect(dataBpm.total).toBe(5);
      expect(dataBpm.items).toHaveLength(5);
    });
  });

  describe("GET /api/tracks/[slug] - Single Track Retrieval", () => {
    it("returns 200 with track details for an existing published track", async () => {
      const req = new Request("http://localhost:3000/api/tracks/nang-sai-gon");
      const res = await getTrackBySlug(req, {
        params: Promise.resolve({ slug: "nang-sai-gon" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.slug).toBe("nang-sai-gon");
      expect(data.title).toBe("Nắng Sài Gòn");
      expect(data.genre).toBe("Pop Acoustic");
      expect(data.mood).toBe("Uplifting");
      expect(data.bpm).toBe(112);

      assertNoForbiddenKeys(data);
    });

    it("returns 404 for a non-existent slug", async () => {
      const req = new Request("http://localhost:3000/api/tracks/does-not-exist");
      const res = await getTrackBySlug(req, {
        params: Promise.resolve({ slug: "does-not-exist" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "Track not found",
        },
      });
    });

    it("returns 404 for a track with non-published status", async () => {
      await prisma.track.create({
        data: {
          slug: "test-004-hidden-draft",
          title: "Hidden Draft",
          genre: "Ambient",
          mood: "Dark",
          durationSeconds: 150,
          previewFileUrl: "/audio/previews/test.mp3",
          status: TrackStatus.draft,
        },
      });

      const req = new Request("http://localhost:3000/api/tracks/test-004-hidden-draft");
      const res = await getTrackBySlug(req, {
        params: Promise.resolve({ slug: "test-004-hidden-draft" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/filters - Distinct Published Genres & Moods", () => {
    it("returns sorted, deduplicated active genres and moods", async () => {
      const res = await getFilters();
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("genres");
      expect(data).toHaveProperty("moods");

      expect(data.genres).toEqual([
        "Cinematic Ambient",
        "Electronic Future Bass",
        "Lo-fi Chill",
        "Pop Acoustic",
        "Traditional Fusion",
      ]);

      expect(data.moods).toEqual([
        "Energetic",
        "Melancholic",
        "Peaceful",
        "Relaxing",
        "Uplifting",
      ]);

      assertNoForbiddenKeys(data);
    });

    it("excludes genres and moods from non-published tracks", async () => {
      await prisma.track.create({
        data: {
          slug: "test-004-unpublished-genre",
          title: "Unpublished Genre Track",
          genre: "Zombie Metal",
          mood: "Terrifying",
          durationSeconds: 200,
          previewFileUrl: "/audio/previews/test.mp3",
          status: TrackStatus.draft,
        },
      });

      const res = await getFilters();
      const data = await res.json();

      expect(data.genres).not.toContain("Zombie Metal");
      expect(data.moods).not.toContain("Terrifying");
    });
  });

  describe("Security Assertions - Zero Forbidden Key Exposure", () => {
    it("never includes forbidden keys anywhere in GET /api/tracks payload", async () => {
      const req = new Request("http://localhost:3000/api/tracks?limit=50");
      const res = await getTracks(req);
      const data = await res.json();

      assertNoForbiddenKeys(data);
      for (const item of data.items) {
        expect(item).not.toHaveProperty("originalFileKey");
        expect(item).not.toHaveProperty("original_file_key");
        expect(item).not.toHaveProperty("status");
        expect(item).not.toHaveProperty("reservedUntil");
        expect(item).not.toHaveProperty("reserved_until");
      }
    });

    it("never includes forbidden keys in GET /api/tracks/[slug] payload", async () => {
      const req = new Request("http://localhost:3000/api/tracks/nang-sai-gon");
      const res = await getTrackBySlug(req, {
        params: Promise.resolve({ slug: "nang-sai-gon" }),
      });
      const data = await res.json();

      assertNoForbiddenKeys(data);
      expect(data).not.toHaveProperty("originalFileKey");
      expect(data).not.toHaveProperty("original_file_key");
      expect(data).not.toHaveProperty("status");
      expect(data).not.toHaveProperty("reservedUntil");
      expect(data).not.toHaveProperty("reserved_until");
    });
  });
});
