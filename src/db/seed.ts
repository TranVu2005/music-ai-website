import { PrismaClient, TrackStatus } from "@prisma/client";
import { buildTrackSearchText } from "../lib/search/normalize";

const prisma = new PrismaClient();

// Demo tracks: CC0 / public domain recordings from Wikimedia Commons (previews trimmed to 20 s, watermarked).
// BPM values are estimates. Replace with the client's real tracks before any real use.
export const sampleTracks = [
  {
    title: "Softly",
    slug: "softly",
    description: "Giai điệu êm dịu, nhịp chậm, phù hợp nhạc nền thư giãn. Nguồn: Loyalty Freak Music (CC0).",
    genre: "Chill Electronic",
    mood: "Relaxing",
    bpm: 92,
    durationSeconds: 20,
    previewFileUrl: "/audio/previews/softly.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Shoepop",
    slug: "shoepop",
    description: "Nhạc pop vui nhộn, nhịp điệu nhẹ nhàng, hợp video đời thường. Nguồn: Loyalty Freak Music (CC0).",
    genre: "Indie Pop",
    mood: "Uplifting",
    bpm: 100,
    durationSeconds: 20,
    previewFileUrl: "/audio/previews/shoepop.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Work",
    slug: "work",
    description: "Nhịp đều, tập trung, tạo cảm giác năng động cho nội dung công việc. Nguồn: Loyalty Freak Music (CC0).",
    genre: "Electronic",
    mood: "Energetic",
    bpm: 123,
    durationSeconds: 20,
    previewFileUrl: "/audio/previews/work.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Merfolk Music Box",
    slug: "merfolk-music-box",
    description: "Giai điệu hộp nhạc trong trẻo, huyền ảo, hợp cảnh nhẹ nhàng. Nguồn: Komiku (CC0).",
    genre: "Chiptune Fantasy",
    mood: "Dreamy",
    bpm: 120,
    durationSeconds: 20,
    previewFileUrl: "/audio/previews/merfolk-music-box.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Ambient Pad",
    slug: "ambient-yamaha",
    description: "Không gian âm thanh ambient mênh mang, hợp nền thiền và phim ngắn. Nguồn: Wikimedia Commons (CC0).",
    genre: "Ambient",
    mood: "Peaceful",
    bpm: 62,
    durationSeconds: 20,
    previewFileUrl: "/audio/previews/ambient-yamaha.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
];

export async function seed() {
  for (const track of sampleTracks) {
    const searchText = buildTrackSearchText(track.title, track.description);
    await prisma.track.upsert({
      where: { slug: track.slug },
      update: {
        title: track.title,
        description: track.description,
        searchText,
        genre: track.genre,
        mood: track.mood,
        bpm: track.bpm,
        durationSeconds: track.durationSeconds,
        previewFileUrl: track.previewFileUrl,
        originalFileKey: track.originalFileKey,
        coverImageUrl: track.coverImageUrl,
        status: track.status,
      },
      create: { ...track, searchText },
    });
  }
}

async function main() {
  try {
    await seed();
    console.log(`Database seeded successfully with ${sampleTracks.length} sample tracks.`);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "test") {
  main();
}
