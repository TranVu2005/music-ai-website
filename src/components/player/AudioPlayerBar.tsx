"use client";

import Link from "next/link";
import { vi } from "../../lib/i18n/vi";
import { formatDuration, template } from "../../lib/format";
import { TrackArtwork } from "../catalog/TrackArtwork";
import { PlayIcon } from "../catalog/PlayIcon";
import { usePlayer } from "./AudioPlayerContext";

export function AudioPlayerBar() {
  const player = usePlayer();
  const { track } = player;
  if (!track) return null;

  const busy = player.status === "playing" || player.status === "loading";
  const duration = player.duration > 0 ? player.duration : track.durationSeconds;
  const progress = duration > 0 ? Math.min(100, (player.currentTime / duration) * 100) : 0;
  const volumeValue = player.muted ? 0 : player.volume;

  return (
    <section
      aria-label={vi.player.region}
      className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl bg-ink text-white md:inset-x-0 md:bottom-0 md:rounded-none"
    >
      <div className="h-1 bg-white/10 md:hidden" aria-hidden="true">
        <div className="h-full bg-[#e08a76]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-10">
        <div className="flex min-w-0 items-center gap-3 md:w-1/4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
            <TrackArtwork
              slug={track.slug}
              coverImageUrl={track.coverImageUrl}
              alt={template(vi.catalog.coverAlt, { title: track.title })}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{track.title}</p>
            <p className="hidden truncate text-sm text-white/65 md:block">
              {vi.brand.name} · {track.genre}
            </p>
            <p className="text-xs text-white/65 md:hidden">
              {formatDuration(player.currentTime)} / {formatDuration(duration)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center md:flex-1">
          <button
            type="button"
            aria-label={busy ? vi.player.pause : vi.player.play}
            onClick={() => player.toggle(track)}
            className="grid h-12 w-12 place-items-center rounded-full bg-[#faf7f0] text-ink md:h-14 md:w-14"
          >
            <PlayIcon playing={busy} />
          </button>
          <div className="mt-1 hidden w-full max-w-xl items-center gap-3 text-xs text-white/70 md:flex">
            <span>{formatDuration(player.currentTime)}</span>
            <input
              type="range"
              aria-label={vi.player.seek}
              min={0}
              max={Math.max(1, Math.floor(duration))}
              step={1}
              value={Math.min(Math.floor(player.currentTime), Math.max(1, Math.floor(duration)))}
              onChange={(e) => player.seek(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-[#e08a76]"
            />
            <span>{formatDuration(duration)}</span>
          </div>
          {player.error ? (
            <p role="alert" className="mt-1 text-xs text-[#e08a76]">
              {vi.player.loadError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 md:w-1/4 md:gap-5">
          <div className="hidden items-center gap-2 lg:flex">
            <button
              type="button"
              aria-label={player.muted ? vi.player.unmute : vi.player.mute}
              aria-pressed={player.muted}
              onClick={player.toggleMute}
              className="text-white/80"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 9v6h4l5 4V5L7 9z" />
                {player.muted ? <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" /> : <path d="M16 8a5 5 0 010 8" stroke="currentColor" strokeWidth="2" fill="none" />}
              </svg>
            </button>
            <input
              type="range"
              aria-label={vi.player.volume}
              min={0}
              max={100}
              step={5}
              value={Math.round(volumeValue * 100)}
              onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
              className="h-1 w-24 cursor-pointer accent-white"
            />
          </div>
          <Link
            href={`/tracks/${track.slug}`}
            className="hidden whitespace-nowrap rounded-full bg-rust px-5 py-3 text-sm font-semibold md:inline-block"
          >
            {vi.player.viewTrack}
          </Link>
        </div>
      </div>
    </section>
  );
}
