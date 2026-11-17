"use client";

import Link from "next/link";
import { useState } from "react";
import { vi } from "../../lib/i18n/vi";
import { navItems } from "./navItems";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        aria-label={open ? vi.nav.closeMenu : vi.nav.openMenu}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>
      {open && (
        <nav
          id="mobile-menu"
          aria-label={vi.nav.mobileLabel}
          className="absolute right-0 mt-3 w-56 rounded-2xl border border-line bg-cream p-3 text-sm font-medium shadow-lg"
        >
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 hover:bg-cream2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
