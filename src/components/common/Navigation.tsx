import Link from "next/link";
import { vi } from "../../lib/i18n/vi";
import { navItems } from "./navItems";

export function Navigation() {
  return (
    <nav aria-label={vi.nav.mainLabel} className="hidden lg:block">
      <ul className="flex gap-8 text-sm font-medium">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-rust">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
