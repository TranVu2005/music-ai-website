import {
  prisma,
  TRACK_PUBLIC_SELECT,
  sanitizeTrack,
  createErrorResponse,
} from "../../../../lib/api/serialization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return createErrorResponse("NOT_FOUND", "Track not found", 404);
    }

    const track = await prisma.track.findFirst({
      where: {
        slug,
        status: "published",
      },
      select: TRACK_PUBLIC_SELECT,
    });

    if (!track) {
      return createErrorResponse("NOT_FOUND", "Track not found", 404);
    }

    return Response.json(sanitizeTrack(track), { status: 200 });
  } catch (error) {
    console.error("[GET /api/tracks/[slug] Error]", error);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}
