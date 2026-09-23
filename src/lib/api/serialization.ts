import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const TRACK_PUBLIC_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  genre: true,
  mood: true,
  bpm: true,
  durationSeconds: true,
  previewFileUrl: true,
  coverImageUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PublicTrack = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  genre: string;
  mood: string;
  bpm: number | null;
  durationSeconds: number;
  previewFileUrl: string;
  coverImageUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export const FORBIDDEN_KEYS = new Set([
  "originalFileKey",
  "original_file_key",
  "status",
  "reservedUntil",
  "reserved_until",
  "reservedByOrderId",
  "reserved_by_order_id",
]);

export function sanitizeTrack<T extends Record<string, unknown>>(track: T): PublicTrack {
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(track)) {
    if (!FORBIDDEN_KEYS.has(key)) {
      sanitized[key] = val;
    }
  }
  return sanitized as unknown as PublicTrack;
}

export function createErrorResponse(code: string, message: string, status: number): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
