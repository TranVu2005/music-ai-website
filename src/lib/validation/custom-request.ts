import { z } from "zod";

const singleLine = (value: string) => !/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(value);

const optionalText = (max: number, oneLine = false) =>
  z.preprocess(
    (value) => value == null ? "" : value,
    z.string().refine((value) => !oneLine || singleLine(value), "singleLine")
      .trim().max(max, "tooLong")
      .transform((value) => value || null),
  );

export const customRequestSchema = z.object({
  customerName: z.string().refine(singleLine, "singleLine").trim().min(1, "required").max(100, "tooLong"),
  customerEmail: z.string().trim().max(254, "tooLong").email("invalidEmail"),
  customerPhone: optionalText(20, true),
  briefDescription: z.string().trim().min(20, "briefTooShort").max(5000, "tooLong"),
  genrePreference: optionalText(100, true),
  targetDuration: optionalText(50, true),
  referenceLinks: optionalText(2000),
  budgetEstimate: z.preprocess(
    (value) => value == null ? null : value,
    z.number().int("invalidBudget").min(0, "invalidBudget").max(10000000000, "invalidBudget")
      .transform((value) => BigInt(value)).nullable(),
  ),
});

export type CustomRequestInput = z.input<typeof customRequestSchema>;
export type CustomRequestPayload = z.output<typeof customRequestSchema>;

export function validationMessageKey(field: string, message: string): string {
  if (!message.startsWith("Invalid")) return message;
  if (field === "budgetEstimate") return "invalidBudget";
  if (field === "customerEmail") return "invalidEmail";
  return "required";
}

export function normalizeBudgetInput(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return null;
  const value = Number(text.replaceAll(".", ""));
  return Number.isSafeInteger(value) && value <= 10000000000 ? value : null;
}
