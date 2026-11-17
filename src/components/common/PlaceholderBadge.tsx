import { vi } from "../../lib/i18n/vi";

export function PlaceholderBadge() {
  return (
    <span
      data-testid="placeholder-badge"
      className="inline-block shrink-0 whitespace-nowrap rounded-full border border-rust px-3 py-1 text-xs font-semibold text-rust"
    >
      {vi.common.placeholderBadge}
    </span>
  );
}
