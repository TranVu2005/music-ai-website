import { PrismaClient } from "@prisma/client";
import { buildTrackSearchText } from "../src/lib/search/normalize";

export async function backfillSearchText(prisma: PrismaClient): Promise<{ scanned: number; updated: number }> {
  const tracks = await prisma.track.findMany({
    select: { id: true, title: true, description: true, searchText: true },
  });
  let updated = 0;

  for (const track of tracks) {
    const searchText = buildTrackSearchText(track.title, track.description);
    if (track.searchText !== searchText) {
      await prisma.track.update({ where: { id: track.id }, data: { searchText } });
      updated++;
    }
  }

  return { scanned: tracks.length, updated };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const { scanned, updated } = await backfillSearchText(prisma);
    console.log(`Search text backfill: scanned=${scanned} updated=${updated}`);
  } catch (error) {
    console.error("Search text backfill failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "test") {
  void main();
}
