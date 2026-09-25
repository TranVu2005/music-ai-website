import { Resend } from "resend";
import type { CustomRequestData, EmailProvider } from "./EmailProvider";
import { formatCustomRequestEmail } from "./EmailProvider";

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly to: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async sendCustomRequestNotification(data: CustomRequestData): Promise<void> {
    const result = await this.resend.emails.send({
      from: this.from,
      to: this.to,
      replyTo: data.customerEmail,
      subject: `Custom music request ${data.id}`,
      text: formatCustomRequestEmail(data),
    });
    if (result.error) throw new Error(result.error.name);
  }
}
