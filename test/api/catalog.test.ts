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
import { buildTrackSearchText } from "../../src/lib/search/normalize";
import { sampleTracks } from "../../src/db/seed";

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
      searchText: "internal search text",
      search_text: "internal search text",
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

  it("rejects page exceeding MAX_PAGE (10000) with 400 BAD_REQUEST without hitting DB", async () => {
    const overflowPages = ["10001", "99999999999", "1000000000000000000000"];
    for (const p of overflowPages) {
      const req = new Request(`http://localhost:3000/api/tracks?page=${p}`);
      const res = await getTracks(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid 'page' parameter: must be <= 10000",
        },
      });
    }
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

  // Number of published tracks the seed provides; tests must not hardcode seed contents.
  const SEEDED = sampleTracks.length;

  // Creates a published fixture track; every fixture slug must start with "test-004-" for cleanup.
  async function createFixture(
    slug: string,
    fields: { title: string; description?: string | null; genre: string; mood: string; bpm?: number },
  ) {
    return prisma.track.create({
      data: {
        slug,
        title: fields.title,
        description: fields.description ?? null,
        searchText: buildTrackSearchText(fields.title, fields.description ?? null),
        genre: fields.genre,
        mood: fields.mood,
        bpm: fields.bpm ?? 100,
        durationSeconds: 20,
        previewFileUrl: "/audio/previews/test.mp3",
        status: TrackStatus.published,
      },
    });
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
    it("returns default pagination with all seeded tracks and totalPages = 1", async () => {
      const req = new Request("http://localhost:3000/api/tracks");
      const res = await getTracks(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("total", SEEDED);
      expect(data).toHaveProperty("page", 1);
      expect(data).toHaveProperty("limit", 10);
      expect(data).toHaveProperty("totalPages", 1);
      expect(data.items).toHaveLength(SEEDED);

      assertNoForbiddenKeys(data);
    });

    it("supports custom page and limit pagination", async () => {
      const req = new Request("http://localhost:3000/api/tracks?page=2&limit=2");
      const res = await getTracks(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.page).toBe(2);
      expect(data.limit).toBe(2);
      expect(data.total).toBe(SEEDED);
      expect(data.totalPages).toBe(Math.ceil(SEEDED / 2));
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
      expect(data.items).toHaveLength(SEEDED);
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
      expect(data.total).toBe(SEEDED);
      expect(data.page).toBe(999);
      expect(data.totalPages).toBe(1);
    });

    it("rejects page > MAX_PAGE (10000) with HTTP 400 (preventing Int32 overflow)", async () => {
      const overflowPages = ["10001", "99999999999"];
      for (const p of overflowPages) {
        const req = new Request(`http://localhost:3000/api/tracks?page=${p}`);
        const res = await getTracks(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toEqual({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid 'page' parameter: must be <= 10000",
          },
        });
      }
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
            searchText: buildTrackSearchText("Draft Track", null),
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.draft,
          },
          {
            slug: "test-004-archived",
            title: "Archived Track",
            searchText: buildTrackSearchText("Archived Track", null),
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.archived,
          },
          {
            slug: "test-004-reserved",
            title: "Reserved Track",
            searchText: buildTrackSearchText("Reserved Track", null),
            genre: "Test Genre",
            mood: "Test Mood",
            durationSeconds: 120,
            previewFileUrl: "/audio/previews/test.mp3",
            status: TrackStatus.reserved,
          },
          {
            slug: "test-004-sold-exclusive",
            title: "Sold Exclusive Track",
            searchText: buildTrackSearchText("Sold Exclusive Track", null),
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

      expect(data.total).toBe(SEEDED);
      const slugs = data.items.map((t: { slug: string }) => t.slug);
      expect(slugs).not.toContain("test-004-draft");
      expect(slugs).not.toContain("test-004-archived");
      expect(slugs).not.toContain("test-004-reserved");
      expect(slugs).not.toContain("test-004-sold-exclusive");
    });

    it("searches q without accents or case across title and description", async () => {
      // Own fixtures with unique tokens, so the result does not depend on seed contents.
      await createFixture("test-004-search-title", {
        title: "Zqxview Đêm Đông",
        description: "Giai điệu mộc mạc",
        genre: "Test Genre A",
        mood: "Test Mood A",
      });
      await createFixture("test-004-search-desc", {
        title: "Zqxplain",
        description: "Tiếng sáo zqxflute êm dịu",
        genre: "Test Genre B",
        mood: "Test Mood B",
      });

      // Title match, case-insensitive and accent-insensitive
      for (const q of ["zqxview dem dong", "ZQXVIEW DEM DONG", "Zqxview Đêm Đông", "zqxview đêm"]) {
        const res = await getTracks(new Request(`http://localhost:3000/api/tracks?q=${encodeURIComponent(q)}`));
        const data = await res.json();
        expect(data.items).toHaveLength(1);
        expect(data.items[0].slug).toBe("test-004-search-title");
      }

      // Description match: "tiếng sáo zqxflute" is only in the second fixture's description
      for (const q of ["tieng sao zqxflute", "TIẾNG SÁO ZQXFLUTE"]) {
        const res = await getTracks(new Request(`http://localhost:3000/api/tracks?q=${encodeURIComponent(q)}`));
        const data = await res.json();
        expect(data.items).toHaveLength(1);
        expect(data.items[0].slug).toBe("test-004-search-desc");
      }

      const noMatch = await getTracks(new Request("http://localhost:3000/api/tracks?q=xyz-no-match"));
      const noMatchData = await noMatch.json();
      expect(noMatchData.items).toEqual([]);
      expect(noMatchData.total).toBe(0);
    });

    it("treats empty or whitespace q as no filter", async () => {
      const req = new Request("http://localhost:3000/api/tracks?q=%20%20%20");
      const res = await getTracks(req);
      const data = await res.json();
      expect(data.total).toBe(SEEDED);

      const marksOnly = await getTracks(new Request("http://localhost:3000/api/tracks?q=%CC%81"));
      expect((await marksOnly.json()).total).toBe(SEEDED);
    });

    it("escapes SQL wildcards (% and _) so they do not match everything", async () => {
      // Searching % should NOT match all seeded tracks; it should only match tracks containing literal %
      const reqPercent = new Request("http://localhost:3000/api/tracks?q=%25");
      const resPercent = await getTracks(reqPercent);
      const dataPercent = await resPercent.json();
      expect(dataPercent.items).toHaveLength(0);
      expect(dataPercent.total).toBe(0);

      // Searching _ should NOT match all seeded tracks
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
          searchText: buildTrackSearchText("Track with 100% Volume", null),
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

    it("matches literal backslashes without treating them as pattern escapes", async () => {
      const backslashQuery = new URLSearchParams({ q: "\\" });
      const backslashUrl = `http://localhost:3000/api/tracks?${backslashQuery.toString()}`;
      const before = await getTracks(new Request(backslashUrl));
      expect((await before.json()).items).toEqual([]);

      await prisma.track.create({
        data: {
          slug: "test-004-literal-backslash",
          title: "Track with C:\\music path",
          searchText: buildTrackSearchText("Track with C:\\music path", null),
          genre: "Lo-fi Chill",
          mood: "Relaxing",
          durationSeconds: 100,
          previewFileUrl: "/audio/previews/test.mp3",
          status: TrackStatus.published,
        },
      });

      const match = await getTracks(new Request(backslashUrl));
      const matchData = await match.json();
      expect(matchData.items).toHaveLength(1);
      expect(matchData.items[0].slug).toBe("test-004-literal-backslash");

      const pathQuery = new URLSearchParams({ q: "path\\\\dir" });
      const noMatch = await getTracks(
        new Request(`http://localhost:3000/api/tracks?${pathQuery.toString()}`)
      );
      expect((await noMatch.json()).items).toEqual([]);
    });

    it("filters by genre and mood", async () => {
      await createFixture("test-004-filter-a", { title: "Filter A", genre: "Zqx Genre", mood: "Zqx Mood" });
      await createFixture("test-004-filter-b", { title: "Filter B", genre: "Zqx Genre", mood: "Zqx Other Mood" });
      await createFixture("test-004-filter-c", { title: "Filter C", genre: "Zqx Other Genre", mood: "Zqx Mood" });

      const slugsFor = async (query: string): Promise<string[]> => {
        const res = await getTracks(new Request(`http://localhost:3000/api/tracks?${query}`));
        expect(res.status).toBe(200);
        const data = await res.json();
        return data.items.map((item: { slug: string }) => item.slug).sort();
      };

      expect(await slugsFor("genre=Zqx%20Genre")).toEqual(["test-004-filter-a", "test-004-filter-b"]);
      expect(await slugsFor("mood=Zqx%20Mood")).toEqual(["test-004-filter-a", "test-004-filter-c"]);
      expect(await slugsFor("genre=Zqx%20Genre&mood=Zqx%20Mood")).toEqual(["test-004-filter-a"]);

      // Every seeded track is reachable through its own genre and mood filters.
      for (const track of sampleTracks) {
        expect(await slugsFor(`genre=${encodeURIComponent(track.genre)}`)).toContain(track.slug);
        expect(await slugsFor(`mood=${encodeURIComponent(track.mood)}`)).toContain(track.slug);
      }
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
      // Returns all seeded tracks because bpm=78 has no filtering effect
      expect(dataBpm.total).toBe(SEEDED);
      expect(dataBpm.items).toHaveLength(SEEDED);
    });
  });

  describe("GET /api/tracks/[slug] - Single Track Retrieval", () => {
    it("returns 200 with track details for an existing published track", async () => {
      await createFixture("test-004-detail", {
        title: "Detail Fixture",
        description: "Detail description",
        genre: "Detail Genre",
        mood: "Detail Mood",
        bpm: 112,
      });
      const req = new Request("http://localhost:3000/api/tracks/test-004-detail");
      const res = await getTrackBySlug(req, {
        params: Promise.resolve({ slug: "test-004-detail" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.slug).toBe("test-004-detail");
      expect(data.title).toBe("Detail Fixture");
      expect(data.genre).toBe("Detail Genre");
      expect(data.mood).toBe("Detail Mood");
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
          searchText: buildTrackSearchText("Hidden Draft", null),
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

      const sortedUnique = (values: string[]) => [...new Set(values)].sort();
      expect(data.genres).toEqual(sortedUnique(data.genres));
      expect(data.moods).toEqual(sortedUnique(data.moods));

      // Every seeded (published) genre and mood is present.
      for (const track of sampleTracks) {
        expect(data.genres).toContain(track.genre);
        expect(data.moods).toContain(track.mood);
      }

      // Duplicates collapse to one entry and the result stays sorted.
      await createFixture("test-004-filter-dup-1", { title: "Dup 1", genre: "Zqx Dup Genre", mood: "Zqx Dup Mood" });
      await createFixture("test-004-filter-dup-2", { title: "Dup 2", genre: "Zqx Dup Genre", mood: "Zqx Dup Mood" });
      const withFixtures = await (await getFilters()).json();
      expect(withFixtures.genres.filter((g: string) => g === "Zqx Dup Genre")).toHaveLength(1);
      expect(withFixtures.moods.filter((m: string) => m === "Zqx Dup Mood")).toHaveLength(1);
      expect(withFixtures.genres).toEqual(sortedUnique(withFixtures.genres));
      expect(withFixtures.moods).toEqual(sortedUnique(withFixtures.moods));

      assertNoForbiddenKeys(data);
    });

    it("excludes genres and moods from non-published tracks", async () => {
      await prisma.track.create({
        data: {
          slug: "test-004-unpublished-genre",
          title: "Unpublished Genre Track",
          searchText: buildTrackSearchText("Unpublished Genre Track", null),
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
        expect(item).not.toHaveProperty("searchText");
        expect(item).not.toHaveProperty("search_text");
      }
    });

    it("never includes forbidden keys in GET /api/tracks/[slug] payload", async () => {
      const seededSlug = sampleTracks[0].slug;
      const req = new Request(`http://localhost:3000/api/tracks/${seededSlug}`);
      const res = await getTrackBySlug(req, {
        params: Promise.resolve({ slug: seededSlug }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();

      assertNoForbiddenKeys(data);
      expect(data).not.toHaveProperty("originalFileKey");
      expect(data).not.toHaveProperty("original_file_key");
      expect(data).not.toHaveProperty("status");
      expect(data).not.toHaveProperty("reservedUntil");
      expect(data).not.toHaveProperty("reserved_until");
      expect(data).not.toHaveProperty("searchText");
      expect(data).not.toHaveProperty("search_text");
    });

    it("never includes search text in error payloads", async () => {
      const badRequest = await getTracks(new Request("http://localhost:3000/api/tracks?page=0"));
      const notFound = await getTrackBySlug(new Request("http://localhost:3000/api/tracks/absent"), {
        params: Promise.resolve({ slug: "absent" }),
      });
      assertNoForbiddenKeys(await badRequest.json());
      assertNoForbiddenKeys(await notFound.json());
    });
  });
});
