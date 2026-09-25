import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/api/serialization";
import { customRequestSchema, validationMessageKey } from "../../../lib/validation/custom-request";
import type { EmailProvider } from "../../../lib/email/EmailProvider";
import { createEmailProvider } from "../../../lib/email";
import { createRateLimiter, getClientIp, getTrustedProxyHops, type RateLimiter } from "../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const emailProvider = createEmailProvider();
const rateLimiter = createRateLimiter();

export type CustomRequestDeps = {
  prisma: Pick<PrismaClient, "customRequest">;
  emailProvider: EmailProvider;
  rateLimiter: RateLimiter;
  now: () => number;
  emailTimeoutMs?: number;
};

class BodyTooLargeError extends Error {}

async function readLimitedBody(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function failure(status: number, errors: Record<string, string>): Response {
  return Response.json({ ok: false, errors }, { status });
}

export async function handleCustomRequest(request: Request, deps: CustomRequestDeps): Promise<Response> {
  const clientIp = getClientIp(request, getTrustedProxyHops());
  if (!await deps.rateLimiter.consume(clientIp, deps.now())) return failure(429, { form: "rateLimited" });

  let body: unknown;
  try {
    body = JSON.parse(await readLimitedBody(request));
  } catch (error) {
    if (error instanceof BodyTooLargeError) return failure(413, { form: "tooLarge" });
    return failure(400, { form: "invalidJson" });
  }

  if (body && typeof body === "object" && "website" in body && String(body.website ?? "").trim()) {
    return Response.json({ ok: true }, { status: 201 });
  }

  const parsed = customRequestSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      if (!errors[field]) errors[field] = validationMessageKey(field, issue.message);
    }
    return failure(400, errors);
  }

  let id: string;
  try {
    const row = await deps.prisma.customRequest.create({
      data: { ...parsed.data, status: "submitted" },
      select: { id: true },
    });
    id = row.id;
  } catch (error) {
    console.error("[custom-request] database insert failed", error instanceof Error ? error.name : "UnknownError");
    return failure(500, { form: "serverError" });
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("EmailTimeout")), deps.emailTimeoutMs ?? 10000);
    });
    await Promise.race([
      deps.emailProvider.sendCustomRequestNotification({ id, ...parsed.data }),
      timedOut,
    ]);
  } catch (error) {
    console.error("[custom-request] email failed", id, error instanceof Error ? error.name : "UnknownError");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return Response.json({ ok: true }, { status: 201 });
}

export async function POST(request: Request): Promise<Response> {
  return handleCustomRequest(request, {
    prisma,
    emailProvider,
    rateLimiter,
    now: Date.now,
  });
}
