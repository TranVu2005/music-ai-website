import type { CustomRequestPayload } from "../validation/custom-request";

export type CustomRequestData = CustomRequestPayload & { id: string };

export interface EmailProvider {
  sendCustomRequestNotification(data: CustomRequestData): Promise<void>;
}

export function formatCustomRequestEmail(data: CustomRequestData): string {
  return [
    `Request ID: ${data.id}`,
    `Name: ${data.customerName}`,
    `Email: ${data.customerEmail}`,
    `Phone: ${data.customerPhone ?? ""}`,
    `Brief: ${data.briefDescription}`,
    `Genre: ${data.genrePreference ?? ""}`,
    `Target duration: ${data.targetDuration ?? ""}`,
    `Reference links: ${data.referenceLinks ?? ""}`,
    `Budget estimate (VND): ${data.budgetEstimate?.toString() ?? ""}`,
  ].join("\n");
}
