// Pricing for the Phase 1 demo. ALL prices are PLACEHOLDERS (isPlaceholder: true).
// Replace with real values and remove the flags before any real use.
// Text lives in the vi dictionary; this file holds numbers and structure only.

export type LicenseId = "standard" | "exclusive";
export type LicensePrice = {
  id: LicenseId;
  fromPriceVnd: number;
  rightsCount: number; // number of usage-rights bullets in vi.pricing.licenses[id].rights
  isPlaceholder: boolean;
};

export type AddOn = { id: string; priceVnd: number; isPlaceholder: boolean };

export type CustomPackage = {
  id: "video" | "brand" | "song";
  minVnd: number;
  maxVnd: number;
  freeRevisions: number;
  deliveryDays: number;
  deliverablesCount: number; // length of vi.pricing.packages[id].deliverables
  addOns: AddOn[];
  isPlaceholder: boolean;
};

export type PricingConfig = {
  licenses: LicensePrice[];
  packages: CustomPackage[];
  processSteps: 4;
};

export const pricing: PricingConfig = {
  licenses: [
    { id: "standard", fromPriceVnd: 500_000, rightsCount: 4, isPlaceholder: true },
    { id: "exclusive", fromPriceVnd: 5_000_000, rightsCount: 4, isPlaceholder: true },
  ],
  packages: [
    {
      id: "video",
      minVnd: 2_000_000,
      maxVnd: 5_000_000,
      freeRevisions: 2,
      deliveryDays: 7,
      deliverablesCount: 3,
      addOns: [
        { id: "stems", priceVnd: 500_000, isPlaceholder: true },
        { id: "cutdown", priceVnd: 300_000, isPlaceholder: true },
      ],
      isPlaceholder: true,
    },
    {
      id: "brand",
      minVnd: 8_000_000,
      maxVnd: 25_000_000,
      freeRevisions: 3,
      deliveryDays: 14,
      deliverablesCount: 4,
      addOns: [
        { id: "stems", priceVnd: 1_000_000, isPlaceholder: true },
        { id: "rush", priceVnd: 2_000_000, isPlaceholder: true },
      ],
      isPlaceholder: true,
    },
    {
      id: "song",
      minVnd: 10_000_000,
      maxVnd: 40_000_000,
      freeRevisions: 3,
      deliveryDays: 21,
      deliverablesCount: 4,
      addOns: [
        { id: "mastering", priceVnd: 1_500_000, isPlaceholder: true },
        { id: "stems", priceVnd: 1_000_000, isPlaceholder: true },
      ],
      isPlaceholder: true,
    },
  ],
  processSteps: 4,
};

export function hasPlaceholderPrice(cfg: PricingConfig): boolean {
  return (
    cfg.licenses.some((l) => l.isPlaceholder) ||
    cfg.packages.some((p) => p.isPlaceholder || p.addOns.some((a) => a.isPlaceholder))
  );
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}
