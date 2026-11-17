"use client";

import { useCallback, useEffect, useState } from "react";
import { vi } from "../../lib/i18n/vi";
import { template } from "../../lib/format";
import { FilterGroup } from "./FilterGroup";
import { PaginationBar } from "./PaginationBar";
import { TrackCard, type CatalogTrack } from "./TrackCard";
import { TrackSearchInput } from "./TrackSearchInput";

export const SEARCH_DEBOUNCE_MS = 300;
export const PAGE_SIZE = 12;

export type CatalogInitialParams = { q?: string; genre?: string; mood?: string; page?: number };

type TracksResponse = { items: CatalogTrack[]; total: number; page: number; limit: number; totalPages: number };
type FiltersResponse = { genres: string[]; moods: string[] };

export function CatalogBrowser({ initial = {} }: { initial?: CatalogInitialParams }) {
  const [query, setQuery] = useState(initial.q ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(initial.q ?? "");
  const [genre, setGenre] = useState(initial.genre ?? "");
  const [mood, setMood] = useState(initial.mood ?? "");
  const [page, setPage] = useState(initial.page && initial.page > 0 ? initial.page : 1);
  const [filters, setFilters] = useState<FiltersResponse>({ genres: [], moods: [] });
  const [result, setResult] = useState<{ key: string; data: TracksResponse | null } | null>(null);
  const [lastData, setLastData] = useState<TracksResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = JSON.stringify([debouncedQuery, genre, mood, page, reloadKey]);
  const loading = result?.key !== requestKey;
  const failed = !loading && result?.data === null;
  const data = result?.data ?? lastData;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/filters", { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<FiltersResponse>) : null))
      .then((json) => {
        if (json) setFilters({ genres: json.genres ?? [], moods: json.moods ?? [] });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (query === debouncedQuery) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    // Raw query goes to the API; accent-insensitive matching happens server-side (Task 004b).
    if (debouncedQuery.trim().length > 0) params.set("q", debouncedQuery);
    if (genre) params.set("genre", genre);
    if (mood) params.set("mood", mood);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    fetch(`/api/tracks?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TracksResponse>;
      })
      .then((json) => {
        setLastData(json);
        setResult({ key: requestKey, data: json });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({ key: requestKey, data: null });
      });

    // Keep the URL shareable without triggering a navigation.
    const urlParams = new URLSearchParams(params);
    urlParams.delete("limit");
    if (page === 1) urlParams.delete("page");
    const qs = urlParams.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);

    return () => controller.abort();
  }, [debouncedQuery, genre, mood, page, requestKey]);

  const changeGenre = useCallback((value: string) => {
    setGenre(value);
    setPage(1);
  }, []);
  const changeMood = useCallback((value: string) => {
    setMood(value);
    setPage(1);
  }, []);

  const items = data?.items ?? [];

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-5xl font-bold lg:text-6xl">{vi.catalog.title}</h1>
          <p className="mt-3 text-lg text-muted">{vi.catalog.intro}</p>
        </div>
        <TrackSearchInput value={query} onChange={setQuery} />
      </div>

      <div className="mt-8 space-y-4 border-y border-line py-5">
        <FilterGroup label={vi.catalog.genreLabel} options={filters.genres} value={genre} onChange={changeGenre} variant="genre" />
        <FilterGroup label={vi.catalog.moodLabel} options={filters.moods} value={mood} onChange={changeMood} variant="mood" />
      </div>

      <p className="mt-6 text-sm text-muted" role="status">
        {loading
          ? vi.catalog.loading
          : failed
            ? ""
            : template(vi.catalog.resultCount, { count: data?.total ?? 0 })}
      </p>

      {failed ? (
        <div role="alert" className="mt-6 rounded-xl border border-line bg-[#faf7f0] p-6">
          <p>{vi.catalog.error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
          >
            {vi.catalog.retry}
          </button>
        </div>
      ) : !loading && items.length === 0 ? (
        <p className="mt-6 text-muted">{vi.catalog.empty}</p>
      ) : (
        <ul className="mt-6 grid gap-x-6 gap-y-0 md:mt-8 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4">
          {items.map((track) => (
            <li key={track.id}>
              <TrackCard track={track} />
            </li>
          ))}
        </ul>
      )}

      <PaginationBar page={data?.page ?? page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
    </>
  );
}
