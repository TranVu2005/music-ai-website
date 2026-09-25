import { afterEach, describe, expect, it, vi } from "vitest";
import { customRequestSchema } from "../../src/lib/validation/custom-request";
import { createEmailProvider } from "../../src/lib/email";
import { ConsoleEmailProvider } from "../../src/lib/email/ConsoleEmailProvider";
import { ResendEmailProvider } from "../../src/lib/email/ResendEmailProvider";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: vi.fn(function MockResend() { return { emails: { send } }; }) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  send.mockReset();
});

describe("email provider selection", () => {
  it.each([
    [undefined, "sender@example.com", "owner@example.com"],
    ["re_your_resend_api_key", "sender@example.com", "owner@example.com"],
    ["re_real_key", undefined, "owner@example.com"],
    ["re_real_key", "sender@example.com", undefined],
  ])("uses Console provider and redacted error for incomplete production config", (key, from, to) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", key);
    vi.stubEnv("EMAIL_FROM", from);
    vi.stubEnv("OWNER_NOTIFICATION_EMAIL", to);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(createEmailProvider()).toBeInstanceOf(ConsoleEmailProvider);
    expect(errorLog).toHaveBeenCalledExactlyOnceWith("[custom-request] email configuration missing; using redacted Console provider");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("owner@example.com");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("sender@example.com");
  });

  it("uses Resend provider with complete production config", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_real_key");
    vi.stubEnv("EMAIL_FROM", "sender@example.com");
    vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
    expect(createEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });
});

describe("ResendEmailProvider", () => {
  const request = {
    id: "request-123",
    ...customRequestSchema.parse({
      customerName: "Nguyễn Văn A",
      customerEmail: "customer@example.com",
      customerPhone: null,
      briefDescription: "Một bài nhạc nhẹ cho video giới thiệu sản phẩm.",
      genrePreference: "Pop",
      targetDuration: null,
      referenceLinks: null,
      budgetEstimate: null,
    }),
  };

  it("sets replyTo to customer email and subject to request ID only", async () => {
    send.mockResolvedValue({ data: { id: "message-1" }, error: null });
    await new ResendEmailProvider("re_real_key", "sender@example.com", "owner@example.com")
      .sendCustomRequestNotification(request);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({
      replyTo: "customer@example.com",
      subject: "request-123",
    });
    expect(send.mock.calls[0][0].subject).not.toContain("customer@example.com");
    expect(send.mock.calls[0][0].subject).not.toContain("Nguyễn Văn A");
  });

  it("throws when Resend returns result.error", async () => {
    send.mockResolvedValue({ data: null, error: { name: "rate_limit_exceeded", message: "provider rejected" } });
    await expect(new ResendEmailProvider("re_real_key", "sender@example.com", "owner@example.com")
      .sendCustomRequestNotification(request)).rejects.toThrow("rate_limit_exceeded");
  });
});
