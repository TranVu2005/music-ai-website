"use client";

import Link from "next/link";
import { vi } from "../../lib/i18n/vi";
import { formatDuration, template } from "../../lib/format";
import { usePlayer } from "../player/AudioPlayerContext";
import type { PlayerTrack } from "../player/useAudioPlayer";
import { PlayIcon } from "./PlayIcon";
import { TrackArtwork } from "./TrackArtwork";

export type DetailTrack = PlayerTrack & { bpm: number | null; description: string | null };

export function TrackDetail({ track }: { track: DetailTrack }) {
  const player = usePlayer();
  const isCurrent = player.track?.id === track.id;
  const busy = isCurrent && (player.status === "playing" || player.status === "loading");
  const duration = isCurrent && player.duration > 0 ? player.duration : track.durationSeconds;
  const max = Math.max(1, Math.floor(duration));
  const current = isCurrent ? Math.min(Math.floor(player.currentTime), max) : 0;

  return (
    <article>
      <Link href="/tracks" className="text-sm font-medium text-rust">
        ← {vi.trackDetail.back}
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-14">
        <div className="aspect-square overflow-hidden rounded-xl">
          <TrackArtwork
            slug={track.slug}
            coverImageUrl={track.coverImageUrl}
            alt={template(vi.catalog.coverAlt, { title: track.title })}
          />
        </div>
        <div>
          <p className="eyebrow">{vi.brand.name}</p>
          <h1 className="mt-2 font-display text-4xl font-bold lg:text-5xl">{track.title}</h1>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              aria-label={template(busy ? vi.catalog.pausePreview : vi.catalog.preview, { title: track.title })}
              aria-pressed={busy}
              onClick={() => player.toggle(track)}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-white"
            >
              <PlayIcon playing={busy} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3 text-xs text-muted">
              <span>{formatDuration(current)}</span>
              <input
                type="range"
                aria-label={vi.player.seek}
                min={0}
                max={max}
                step={1}
                value={current}
                disabled={!isCurrent}
                onChange={(e) => player.seek(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer accent-[#b0412a]"
              />
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-line py-6 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">{vi.trackDetail.genre}</dt>
              <dd className="mt-1 font-semibold">{track.genre}</dd>
            </div>
            <div>
              <dt className="text-muted">{vi.trackDetail.mood}</dt>
              <dd className="mt-1 font-semibold">{track.mood}</dd>
            </div>
            <div>
              <dt className="text-muted">{vi.trackDetail.bpm}</dt>
              <dd className="mt-1 font-semibold">
                {track.bpm != null ? track.bpm : "—"}
                <span className="block text-xs font-normal text-muted">{vi.trackDetail.bpmNote}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">{vi.trackDetail.duration}</dt>
              <dd className="mt-1 font-semibold">{formatDuration(track.durationSeconds)}</dd>
            </div>
          </dl>

          <h2 className="mt-8 text-lg font-semibold">{vi.trackDetail.descriptionTitle}</h2>
          <p className="mt-2 whitespace-pre-line text-muted">
            {track.description?.trim() ? track.description : vi.trackDetail.noDescription}
          </p>
        </div>
      </div>
    </article>
  );
}
