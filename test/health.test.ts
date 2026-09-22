import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/health/route";

describe("GET /api/health", () => {
  it("returns HTTP 200 with JSON { status: 'ok' }", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});
