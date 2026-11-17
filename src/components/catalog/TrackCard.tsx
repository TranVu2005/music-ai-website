"use client";

import Link from "next/link";
import { vi } from "../../lib/i18n/vi";
import { formatDuration, template } from "../../lib/format";
import { usePlayer } from "../player/AudioPlayerContext";
import type { PlayerTrack } from "../player/useAudioPlayer";
import { TrackArtwork } from "./TrackArtwork";
import { PlayIcon } from "./PlayIcon";

export type CatalogTrack = PlayerTrack & { bpm: number | null };

export function TrackCard({ track }: { track: CatalogTrack }) {
  const player = usePlayer();
  const active =
    player.track?.id === track.id && (player.status === "playing" || player.status === "loading");
  const label = template(active ? vi.catalog.pausePreview : vi.catalog.preview, { title: track.title });
  const meta = [
    formatDuration(track.durationSeconds),
    track.bpm != null ? template(vi.catalog.bpm, { bpm: track.bpm }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="flex items-center gap-4 border-b border-line py-4 md:block md:border-0 md:py-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg md:h-auto md:w-auto md:aspect-square md:rounded-xl">
        <TrackArtwork
          slug={track.slug}
          coverImageUrl={track.coverImageUrl}
          alt={template(vi.catalog.coverAlt, { title: track.title })}
        />
        <span className="absolute left-4 top-4 hidden text-[.65rem] font-semibold uppercase tracking-[.14em] text-white md:block">
          {track.genre}
        </span>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={() => player.toggle(track)}
          className="absolute inset-0 grid place-items-center bg-black/25 text-white md:inset-auto md:bottom-4 md:left-4 md:h-12 md:w-12 md:rounded-full md:bg-[#faf7f0] md:text-ink"
        >
          <PlayIcon playing={active} />
        </button>
      </div>
      <div className="min-w-0 flex-1 md:mt-4">
        <h3 className="font-semibold leading-snug md:text-lg">
          <Link href={`/tracks/${track.slug}`}>{track.title}</Link>
        </h3>
        <p className="text-sm text-muted">
          {vi.brand.name} <span className="md:hidden">· {track.genre}</span>
        </p>
        <p className="text-sm text-muted md:hidden">
          {track.mood} · {meta}
        </p>
        <p className="mt-2 hidden flex-wrap gap-2 text-xs md:flex">
          <span className="rounded-full bg-cream2 px-3 py-1">{track.genre}</span>
          <span className="rounded-full border border-line px-3 py-1">{track.mood}</span>
        </p>
        <div className="mt-3 hidden items-center border-t border-line pt-3 text-sm md:flex">
          <span className="text-muted">{meta}</span>
        </div>
      </div>
    </article>
  );
}
