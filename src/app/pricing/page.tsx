import { PricingContent } from "../../components/pricing/PricingContent";
import { pricing } from "../../config/pricing";
import { vi } from "../../lib/i18n/vi";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(vi.meta.pricing, "/pricing");

export default function PricingPage() {
  return <PricingContent config={pricing} />;
}
