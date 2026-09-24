import { PrismaClient, TrackStatus } from "@prisma/client";
import { buildTrackSearchText } from "../lib/search/normalize";

const prisma = new PrismaClient();

export const sampleTracks = [
  {
    title: "Đêm Đông Hà Nội",
    slug: "dem-dong-ha-noi",
    description: "Giai điệu guitar mộc mạc và tiếng mưa nhẹ nhàng mang không khí mùa đông Hà Nội hoài niệm.",
    genre: "Lo-fi Chill",
    mood: "Melancholic",
    bpm: 78,
    durationSeconds: 145,
    previewFileUrl: "/audio/previews/dem-dong-ha-noi.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Nắng Sài Gòn",
    slug: "nang-sai-gon",
    description: "Tiết tấu tươi vui, tràn đầy năng lượng tích cực kết hợp giữa piano và guitar rộn rã.",
    genre: "Pop Acoustic",
    mood: "Uplifting",
    bpm: 112,
    durationSeconds: 184,
    previewFileUrl: "/audio/previews/nang-sai-gon.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Khoảng Lặng Tây Nguyên",
    slug: "khoang-lang-tay-nguyen",
    description: "Không gian âm thanh mênh mang, kết hợp tiếng sáo trầm ấm và dàn dây điện ảnh sâu lắng.",
    genre: "Cinematic Ambient",
    mood: "Peaceful",
    bpm: 65,
    durationSeconds: 210,
    previewFileUrl: "/audio/previews/khoang-lang-tay-nguyen.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Nhịp Sống Phố Thị",
    slug: "nhip-song-pho-thi",
    description: "Âm bass hiện đại, nhịp điệu dồn dập phù hợp cho video quảng cáo, sự kiện và sáng tạo nội dung.",
    genre: "Electronic Future Bass",
    mood: "Energetic",
    bpm: 128,
    durationSeconds: 160,
    previewFileUrl: "/audio/previews/nhip-song-pho-thi.mp3",
    originalFileKey: null,
    coverImageUrl: null,
    status: TrackStatus.published,
  },
  {
    title: "Hoàng Hôn Sông Hương",
    slug: "hoang-hon-song-huong",
    description: "Sự kết hợp tinh tế giữa đàn tranh truyền thống và nền nhạc lofi hiện đại êm dịu.",
    genre: "Traditional Fusion",
    mood: "Relaxing",
    bpm: 85,
    durationSeconds: 195,
    previewFileUrl: "/audio/previews/hoang-hon-song-huong.mp3",
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
    console.log("Database seeded successfully with 5 sample tracks.");
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
