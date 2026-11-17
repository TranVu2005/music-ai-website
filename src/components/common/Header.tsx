import Link from "next/link";
import { vi } from "../../lib/i18n/vi";
import { template } from "../../lib/format";
import { Navigation } from "./Navigation";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:h-[68px] lg:px-8">
        <Link
          href="/"
          aria-label={template(vi.nav.homeLabel, { brand: vi.brand.name })}
          className="flex items-center gap-3"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rust" />
          </span>
          <span className="font-display text-xl font-bold">{vi.brand.name}</span>
        </Link>
        <Navigation />
        <div className="flex items-center gap-3">
          <Link
            href="/custom-request"
            className="hidden whitespace-nowrap rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white sm:inline-block"
          >
            {vi.common.customCta}
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
