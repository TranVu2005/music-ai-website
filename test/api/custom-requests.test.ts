import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { customRequestSchema, normalizeBudgetInput } from "../../src/lib/validation/custom-request";
import { MemoryRateLimiter, getClientIp } from "../../src/lib/security/rate-limit";
import { handleCustomRequest } from "../../src/app/api/custom-requests/route";
import { vi as dictionary } from "../../src/lib/i18n/vi";
import { formatCustomRequestEmail } from "../../src/lib/email/EmailProvider";

const valid = {
  customerName: "  Nguyễn Văn A  ",
  customerEmail: "  customer@example.com  ",
  customerPhone: "   ",
  briefDescription: "  Một bài nhạc nhẹ cho video giới thiệu sản phẩm.  ",
  genrePreference: "  Pop  ",
  targetDuration: "  ",
  referenceLinks: "  https://example.com  ",
  budgetEstimate: 10000000,
};

describe("custom request validation", () => {
  it("trims strings and converts blank optionals and budget to DB values", () => {
    const parsed = customRequestSchema.parse(valid);
    expect(parsed.customerName).toBe("Nguyễn Văn A");
    expect(parsed.customerEmail).toBe("customer@example.com");
    expect(parsed.customerPhone).toBeNull();
    expect(parsed.targetDuration).toBeNull();
    expect(parsed.genrePreference).toBe("Pop");
    expect(parsed.budgetEstimate).toBe(10000000n);
  });

  it.each([
    [{ briefDescription: "" }, "briefDescription"],
    [{ briefDescription: "short" }, "briefDescription"],
    [{ customerEmail: "bad@" }, "customerEmail"],
    [{ customerName: "x".repeat(101) }, "customerName"],
    [{ customerPhone: "x".repeat(21) }, "customerPhone"],
    [{ genrePreference: "x".repeat(101) }, "genrePreference"],
    [{ targetDuration: "x".repeat(51) }, "targetDuration"],
    [{ referenceLinks: "x".repeat(2001) }, "referenceLinks"],
    [{ budgetEstimate: -1 }, "budgetEstimate"],
    [{ budgetEstimate: 10000000001 }, "budgetEstimate"],
    [{ budgetEstimate: 1.5 }, "budgetEstimate"],
    [{ budgetEstimate: "10.000.000" }, "budgetEstimate"],
    [{ customerName: "A\nB" }, "customerName"],
    [{ customerName: "\nNguyễn Văn A" }, "customerName"],
    [{ customerPhone: "123\r456" }, "customerPhone"],
    [{ customerPhone: "123\n" }, "customerPhone"],
    [{ genrePreference: "Pop\u0000Rock" }, "genrePreference"],
    [{ genrePreference: "Pop\u2028Rock" }, "genrePreference"],
    [{ targetDuration: "2\u0085minutes" }, "targetDuration"],
    [{ customerName: "Nguyễn\u2029Văn A" }, "customerName"],
    [{ targetDuration: "2\tminutes" }, "targetDuration"],
  ] as const)("rejects invalid %j at %s", (change, field) => {
    const result = customRequestSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path[0]).toBe(field);
  });

  it("normalizes Vietnamese budget grouping for the client only", () => {
    expect(normalizeBudgetInput("10.000.000")).toBe(10000000);
    expect(normalizeBudgetInput(" 10000000 ")).toBe(10000000);
    expect(normalizeBudgetInput("")).toBeNull();
    expect(normalizeBudgetInput("10.00.000")).toBeNull();
  });

  it("has every form and response key in the Vietnamese dictionary", () => {
    for (const key of ["title", "intro", "tiersTitle", "name", "email", "phone", "brief", "genre", "duration", "references", "budget", "submit", "submitting", "success", "error", "rateLimited", "validation"]) {
      expect(dictionary.customRequest).toHaveProperty(key);
    }
  });

  it("includes all submitted fields and request ID in plain-text email", () => {
    const content = formatCustomRequestEmail({ id: "request-id", ...customRequestSchema.parse(valid) });
    for (const value of ["request-id", "Nguyễn Văn A", "customer@example.com", "Một bài nhạc nhẹ", "Pop", "https://example.com", "10000000"]) {
      expect(content).toContain(value);
    }
  });
});

describe("rate limiting and proxy address", () => {
  it("limits the sixth request, isolates IPs, and resets at window expiry", () => {
    const limiter = new MemoryRateLimiter(5, 600000);
    for (let i = 0; i < 5; i++) expect(limiter.consume("a", 0)).toBe(true);
    expect(limiter.consume("a", 0)).toBe(false);
    expect(limiter.consume("b", 0)).toBe(true);
    expect(limiter.consume("a", 600000)).toBe(true);
  });

  it("uses the trusted-hop entry, then x-real-ip, then a warned constant", () => {
    const request = new Request("http://localhost/api/custom-requests", { headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.2, 192.0.2.3", "x-real-ip": "192.0.2.4" } });
    expect(getClientIp(request, 1)).toBe("192.0.2.3");
    expect(getClientIp(request, 2)).toBe("198.51.100.2");
    expect(getClientIp(request, 4)).toBe("192.0.2.4");
    const invalidForwarded = new Request("http://localhost/api/custom-requests", { headers: { "x-forwarded-for": "spoofed", "x-real-ip": "192.0.2.5" } });
    expect(getClientIp(invalidForwarded, 1)).toBe("192.0.2.5");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getClientIp(new Request("http://localhost/api/custom-requests"), 1)).toBe("unknown-client");
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it("evicts the oldest IP when the memory cap is reached", () => {
    const limiter = new MemoryRateLimiter(1, 600000, 2);
    expect(limiter.consume("a", 0)).toBe(true);
    expect(limiter.consume("b", 0)).toBe(true);
    expect(limiter.consume("c", 0)).toBe(true);
    expect(limiter.consume("a", 0)).toBe(true);
  });
});

function makeRequest(body: unknown, ip = "client"): Request {
  const addresses: Record<string, string> = { client: "192.0.2.1", a: "192.0.2.2", b: "192.0.2.3", c: "192.0.2.4" };
  return new Request("http://localhost/api/custom-requests", {
    method: "POST",
    headers: { "x-forwarded-for": addresses[ip] ?? ip },
    body: JSON.stringify(body),
  });
}

function makeDeps() {
  const create = vi.fn(async () => ({ id: "request-id" }));
  const sendCustomRequestNotification = vi.fn(async () => {});
  return {
    create,
    sendCustomRequestNotification,
    deps: {
      prisma: { customRequest: { create } } as unknown as PrismaClient,
      emailProvider: { sendCustomRequestNotification },
      rateLimiter: new MemoryRateLimiter(5, 600000),
      now: () => 0,
      emailTimeoutMs: 5,
    },
  };
}

describe("custom request handler", () => {
  it("saves before email and returns only ok", async () => {
    const { create, sendCustomRequestNotification, deps } = makeDeps();
    const response = await handleCustomRequest(makeRequest({ ...valid, website: "" }), deps);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(sendCustomRequestNotification.mock.invocationCallOrder[0]);
  });

  it("returns success for honeypot without persistence or email", async () => {
    const { create, sendCustomRequestNotification, deps } = makeDeps();
    const response = await handleCustomRequest(makeRequest({ ...valid, website: "filled" }), deps);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(create).not.toHaveBeenCalled();
    expect(sendCustomRequestNotification).not.toHaveBeenCalled();
  });

  it("enforces body byte limit even without Content-Length", async () => {
    const { create, deps } = makeDeps();
    const request = new Request("http://localhost/api/custom-requests", { method: "POST", body: "é".repeat(8193), headers: { "x-forwarded-for": "192.0.2.1" } });
    expect((await handleCustomRequest(request, deps)).status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and invalid fields", async () => {
    const { deps } = makeDeps();
    const malformed = new Request("http://localhost/api/custom-requests", { method: "POST", body: "{", headers: { "x-forwarded-for": "192.0.2.2" } });
    expect((await handleCustomRequest(malformed, deps)).status).toBe(400);
    const response = await handleCustomRequest(makeRequest({ ...valid, customerEmail: "bad" }, "b"), deps);
    expect(response.status).toBe(400);
    expect((await response.json()).errors).toHaveProperty("customerEmail");
    const budgetResponse = await handleCustomRequest(makeRequest({ ...valid, budgetEstimate: "10.000.000" }, "c"), deps);
    expect((await budgetResponse.json()).errors).toEqual({ budgetEstimate: "invalidBudget" });
  });

  it("returns 429 for the sixth request from one IP", async () => {
    const { deps } = makeDeps();
    for (let i = 0; i < 5; i++) await handleCustomRequest(makeRequest({ website: "bot" }), deps);
    expect((await handleCustomRequest(makeRequest(valid), deps)).status).toBe(429);
  });

  it("keeps 201 when email throws or exceeds a short injected timeout", async () => {
    const { create, sendCustomRequestNotification, deps } = makeDeps();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    sendCustomRequestNotification.mockRejectedValueOnce(new Error("provider down"));
    expect((await handleCustomRequest(makeRequest(valid, "a"), deps)).status).toBe(201);
    sendCustomRequestNotification.mockImplementationOnce(() => new Promise<void>(() => {}));
    expect((await handleCustomRequest(makeRequest(valid, "b"), deps)).status).toBe(201);
    expect(create).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("customer@example.com");
    errorLog.mockRestore();
  });
});

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
if (!process.env.DATABASE_URL && process.env.CI === "true") throw new Error("DATABASE_URL is required in CI");

describeDb("custom request PostgreSQL integration", () => {
  const prisma = new PrismaClient();
  const email = `test-008-${Date.now()}@example.com`;
  beforeAll(async () => { await prisma.customRequest.deleteMany({ where: { customerEmail: email } }); });
  afterEach(async () => { await prisma.customRequest.deleteMany({ where: { customerEmail: email } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("persists one submitted row before successful email delivery", async () => {
    const sendCustomRequestNotification = vi.fn(async () => {
      const rows = await prisma.customRequest.count({ where: { customerEmail: email } });
      expect(rows).toBe(1);
    });
    const response = await handleCustomRequest(makeRequest({ ...valid, customerEmail: email }), {
      prisma,
      emailProvider: { sendCustomRequestNotification },
      rateLimiter: new MemoryRateLimiter(),
      now: () => 0,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendCustomRequestNotification).toHaveBeenCalledOnce();
    const rows = await prisma.customRequest.findMany({ where: { customerEmail: email } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "submitted", budgetEstimate: 10000000n, customerPhone: null });
  });

  it("persists submitted fields including BigInt when email fails", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleCustomRequest(makeRequest({ ...valid, customerEmail: email }), {
      prisma,
      emailProvider: { sendCustomRequestNotification: async () => { throw new Error("offline"); } },
      rateLimiter: new MemoryRateLimiter(5, 600000),
      now: () => 0,
      emailTimeoutMs: 5,
    });
    expect(response.status).toBe(201);
    const rows = await prisma.customRequest.findMany({ where: { customerEmail: email } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ customerName: "Nguyễn Văn A", status: "submitted", budgetEstimate: 10000000n, customerPhone: null });
    errorLog.mockRestore();
  });

  it("keeps the row when email times out with a short injected timeout", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleCustomRequest(makeRequest({ ...valid, customerEmail: email }), {
      prisma,
      emailProvider: { sendCustomRequestNotification: () => new Promise<void>(() => {}) },
      rateLimiter: new MemoryRateLimiter(),
      now: () => 0,
      emailTimeoutMs: 5,
    });
    expect(response.status).toBe(201);
    expect(await prisma.customRequest.count({ where: { customerEmail: email } })).toBe(1);
    errorLog.mockRestore();
  });

  it("discards a filled honeypot without inserting a row", async () => {
    const sendCustomRequestNotification = vi.fn(async () => {});
    const response = await handleCustomRequest(makeRequest({ ...valid, customerEmail: email, website: "bot" }), {
      prisma,
      emailProvider: { sendCustomRequestNotification },
      rateLimiter: new MemoryRateLimiter(),
      now: () => 0,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(await prisma.customRequest.count({ where: { customerEmail: email } })).toBe(0);
    expect(sendCustomRequestNotification).not.toHaveBeenCalled();
  });
});
