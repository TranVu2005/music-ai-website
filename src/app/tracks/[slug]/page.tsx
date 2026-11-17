import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackDetail } from "../../../components/catalog/TrackDetail";
import { prisma, TRACK_PUBLIC_SELECT } from "../../../lib/api/serialization";
import { vi } from "../../../lib/i18n/vi";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function loadTrack(slug: string) {
  return prisma.track.findFirst({
    where: { slug, status: "published" },
    select: TRACK_PUBLIC_SELECT,
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const track = await loadTrack(slug);
  return { title: track ? `${track.title} – ${vi.brand.name}` : vi.trackDetail.notFoundTitle };
}

export default async function TrackDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const track = await loadTrack(slug);
  if (!track) notFound();

  return (
    <main id="noi-dung" className="mx-auto max-w-7xl px-5 pb-40 pt-8 lg:px-8 lg:pt-14">
      <TrackDetail
        track={{
          id: track.id,
          slug: track.slug,
          title: track.title,
          genre: track.genre,
          mood: track.mood,
          bpm: track.bpm,
          description: track.description,
          durationSeconds: track.durationSeconds,
          previewFileUrl: track.previewFileUrl,
          coverImageUrl: track.coverImageUrl,
        }}
      />
    </main>
  );
}
