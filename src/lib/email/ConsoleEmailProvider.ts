import type { CustomRequestData, EmailProvider } from "./EmailProvider";
import { formatCustomRequestEmail } from "./EmailProvider";

export class ConsoleEmailProvider implements EmailProvider {
  async sendCustomRequestNotification(data: CustomRequestData): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      console.info("[custom-request] email delivery unavailable for request", data.id);
      return;
    }
    console.info("[custom-request] local email preview\n" + formatCustomRequestEmail(data));
  }
}
