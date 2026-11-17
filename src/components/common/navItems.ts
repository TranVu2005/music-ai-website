import { vi } from "../../lib/i18n/vi";

export const navItems = [
  { href: "/tracks", label: vi.nav.catalog },
  { href: "/pricing", label: vi.nav.pricing },
  { href: "/custom-request", label: vi.nav.custom },
  { href: "/about", label: vi.nav.about },
  { href: "/contact", label: vi.nav.contact },
] as const;
