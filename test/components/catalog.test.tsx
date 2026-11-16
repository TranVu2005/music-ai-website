// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { AudioPlayerProvider } from "../../src/components/player/AudioPlayerContext";
import { CatalogBrowser, SEARCH_DEBOUNCE_MS } from "../../src/components/catalog/CatalogBrowser";
import { TrackDetail } from "../../src/components/catalog/TrackDetail";
import { installAudioMock } from "./audio-mock";

function makeTrack(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `id-${n}`,
    slug: `track-${n}`,
    title: `Bài ${n}`,
    description: null,
    genre: "Lo-fi Chill",
    mood: "Man mác",
    bpm: 70 + n,
    durationSeconds: 145,
    previewFileUrl: `/audio/previews/${n}.mp3`,
    coverImageUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const TRACKS = [makeTrack(1), makeTrack(2, { genre: "Pop Acoustic", mood: "Tươi sáng" })];

let fetchMock: ReturnType<typeof vi.fn>;

function installFetch(overrides?: { tracks?: () => Response }) {
  fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/filters")) {
      return Promise.resolve(
        Response.json({ genres: ["Lo-fi Chill", "Pop Acoustic"], moods: ["Man mác", "Tươi sáng"] })
      );
    }
    if (overrides?.tracks) return Promise.resolve(overrides.tracks());
    return Promise.resolve(
      Response.json({ items: TRACKS, total: 2, page: 1, limit: 12, totalPages: 1 })
    );
  });
  vi.stubGlobal("fetch", fetchMock);
}

const trackUrls = () =>
  fetchMock.mock.calls.map((c) => String(c[0])).filter((u) => u.startsWith("/api/tracks"));
const lastTrackParams = () => new URL(trackUrls().at(-1)!, "http://x").searchParams;

async function renderCatalog() {
  render(
    <AudioPlayerProvider>
      <CatalogBrowser />
    </AudioPlayerProvider>
  );
  await screen.findByText("Bài 1");
}

describe("catalog page", () => {
  beforeEach(() => {
    installAudioMock();
    installFetch();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the track list from the API", async () => {
    await renderCatalog();
    expect(screen.getByText("Bài 2")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 bài phù hợp");
    // BPM is plain metadata, never a filter control.
    expect(screen.getAllByText(/71 BPM/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /BPM/ })).toBeNull();
    expect(trackUrls()).toHaveLength(1);
    expect(lastTrackParams().get("limit")).toBe("12");
  });

  it("never exposes non-public fields", async () => {
    await renderCatalog();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/originalFileKey|searchText|reservedUntil/);
  });

  it("debounces search and sends the raw query", async () => {
    await renderCatalog();
    vi.useFakeTimers();
    const input = screen.getByRole("searchbox", { name: "Tìm bài nhạc" });

    fireEvent.change(input, { target: { value: "đ" } });
    fireEvent.change(input, { target: { value: "đêm đông" } });
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(trackUrls()).toHaveLength(1); // nothing sent yet

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(trackUrls()).toHaveLength(2);
    expect(lastTrackParams().get("q")).toBe("đêm đông"); // raw, accents preserved
  });

  it("genre and mood selection updates the API query and resets to page 1", async () => {
    await renderCatalog();

    fireEvent.click(await screen.findByRole("button", { name: "Pop Acoustic" }));
    await waitFor(() => expect(lastTrackParams().get("genre")).toBe("Pop Acoustic"));

    fireEvent.click(screen.getByRole("button", { name: "Tươi sáng" }));
    await waitFor(() => expect(lastTrackParams().get("mood")).toBe("Tươi sáng"));
    expect(lastTrackParams().get("genre")).toBe("Pop Acoustic");
    expect(lastTrackParams().get("page")).toBe("1");

    // "Tất cả" in the genre group clears only the genre filter.
    const genreGroup = screen.getByRole("group", { name: "Thể loại" });
    fireEvent.click(genreGroup.querySelector("button")!);
    await waitFor(() => expect(lastTrackParams().has("genre")).toBe(false));
    expect(lastTrackParams().get("mood")).toBe("Tươi sáng");
  });

  it("shows an empty state and an error state with retry", async () => {
    installFetch({
      tracks: () => Response.json({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    });
    render(
      <AudioPlayerProvider>
        <CatalogBrowser />
      </AudioPlayerProvider>
    );
    expect(await screen.findByText(/Không tìm thấy bài nhạc phù hợp/)).toBeInTheDocument();
  });

  it("shows an error when the API fails", async () => {
    installFetch({ tracks: () => new Response("boom", { status: 500 }) });
    render(
      <AudioPlayerProvider>
        <CatalogBrowser />
      </AudioPlayerProvider>
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải danh sách bài nhạc");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });

  it("card play button starts playback and flips to pause", async () => {
    await renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Nghe thử Bài 1" }));
    expect(await screen.findByRole("button", { name: "Tạm dừng Bài 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe thử Bài 2" })).toBeInTheDocument();
  });

  it("starting a second card pauses the first card", async () => {
    await renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Nghe thử Bài 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Nghe thử Bài 2" }));
    expect(await screen.findByRole("button", { name: "Tạm dừng Bài 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe thử Bài 1" })).toBeInTheDocument();
  });
});

describe("track detail", () => {
  beforeEach(() => {
    installAudioMock();
  });

  it("renders title, genre, mood, bpm and duration", () => {
    render(
      <AudioPlayerProvider>
        <TrackDetail
          track={{
            ...makeTrack(3, { description: "Giai điệu nhẹ nhàng." }),
            durationSeconds: 185,
            bpm: 92,
          }}
        />
      </AudioPlayerProvider>
    );
    expect(screen.getByRole("heading", { level: 1, name: "Bài 3" })).toBeInTheDocument();
    expect(screen.getByText("Lo-fi Chill")).toBeInTheDocument();
    expect(screen.getByText("Man mác")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getAllByText("3:05").length).toBeGreaterThan(0);
    expect(screen.getByText("Giai điệu nhẹ nhàng.")).toBeInTheDocument();
  });

  it("falls back gracefully when bpm and description are missing", () => {
    render(
      <AudioPlayerProvider>
        <TrackDetail track={makeTrack(4, { bpm: null, description: null })} />
      </AudioPlayerProvider>
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Chưa có mô tả cho bài nhạc này.")).toBeInTheDocument();
  });
});
