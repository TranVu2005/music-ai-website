import type { EmailProvider } from "./EmailProvider";
import { ConsoleEmailProvider } from "./ConsoleEmailProvider";
import { ResendEmailProvider } from "./ResendEmailProvider";

export function createEmailProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.OWNER_NOTIFICATION_EMAIL;
  if (process.env.NODE_ENV === "production" && key && key !== "re_your_resend_api_key" && from && to) {
    return new ResendEmailProvider(key, from, to);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("[custom-request] email configuration missing; using redacted Console provider");
  }
  return new ConsoleEmailProvider();
}
