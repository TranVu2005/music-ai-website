import { Prisma } from "@prisma/client";
import {
  prisma,
  TRACK_PUBLIC_SELECT,
  sanitizeTrack,
  createErrorResponse,
} from "../../../lib/api/serialization";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_PAGE = 10000;

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    let page = DEFAULT_PAGE;
    if (searchParams.has("page")) {
      const rawPage = searchParams.get("page")!;
      if (!/^\d+$/.test(rawPage)) {
        return createErrorResponse(
          "BAD_REQUEST",
          "Invalid 'page' parameter: must be a positive integer",
          400
        );
      }
      const parsedPage = parseInt(rawPage, 10);
      if (parsedPage <= 0) {
        return createErrorResponse(
          "BAD_REQUEST",
          "Invalid 'page' parameter: must be a positive integer",
          400
        );
      }
      if (parsedPage > MAX_PAGE || rawPage.length > 5) {
        return createErrorResponse(
          "BAD_REQUEST",
          `Invalid 'page' parameter: must be <= ${MAX_PAGE}`,
          400
        );
      }
      page = parsedPage;
    }

    let limit = DEFAULT_LIMIT;
    if (searchParams.has("limit")) {
      const rawLimit = searchParams.get("limit")!;
      if (!/^\d+$/.test(rawLimit)) {
        return createErrorResponse(
          "BAD_REQUEST",
          "Invalid 'limit' parameter: must be a positive integer",
          400
        );
      }
      const parsedLimit = parseInt(rawLimit, 10);
      if (parsedLimit <= 0) {
        return createErrorResponse(
          "BAD_REQUEST",
          "Invalid 'limit' parameter: must be a positive integer",
          400
        );
      }
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }

    const where: Prisma.TrackWhereInput = {
      status: "published",
    };

    if (searchParams.has("q")) {
      const rawQ = searchParams.get("q")!;
      const trimmedQ = rawQ.trim();
      if (trimmedQ.length > 0) {
        const escapedQ = trimmedQ.replace(/([%_\\])/g, "\\$1");
        where.OR = [
          {
            title: {
              contains: escapedQ,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: escapedQ,
              mode: "insensitive",
            },
          },
        ];
      }
    }

    if (searchParams.has("genre")) {
      const rawGenre = searchParams.get("genre")!;
      const trimmedGenre = rawGenre.trim();
      if (trimmedGenre.length > 0) {
        where.genre = trimmedGenre;
      }
    }

    if (searchParams.has("mood")) {
      const rawMood = searchParams.get("mood")!;
      const trimmedMood = rawMood.trim();
      if (trimmedMood.length > 0) {
        where.mood = trimmedMood;
      }
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        select: TRACK_PUBLIC_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.track.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return Response.json(
      {
        items: tracks.map(sanitizeTrack),
        total,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/tracks Error]", error);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      500
    );
  }
}
