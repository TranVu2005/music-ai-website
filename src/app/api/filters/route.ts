import { prisma, createErrorResponse } from "../../../lib/api/serialization";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const [genresResult, moodsResult] = await Promise.all([
      prisma.track.findMany({
        where: {
          status: "published",
        },
        select: {
          genre: true,
        },
        distinct: ["genre"],
        orderBy: {
          genre: "asc",
        },
      }),
      prisma.track.findMany({
        where: {
          status: "published",
        },
        select: {
          mood: true,
        },
        distinct: ["mood"],
        orderBy: {
          mood: "asc",
        },
      }),
    ]);

    const genres = genresResult.map((item) => item.genre);
    const moods = moodsResult.map((item) => item.mood);

    return Response.json(
      {
        genres,
        moods,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/filters Error]", error);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}
