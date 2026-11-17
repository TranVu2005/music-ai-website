import Link from "next/link";
import { vi } from "../../lib/i18n/vi";
import { template } from "../../lib/format";
import { contact } from "../../config/contact";

export function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-5 pb-28 pt-14 lg:px-8">
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <p className="font-display text-2xl font-bold">{vi.brand.name}</p>
          <p className="mt-3 max-w-[16rem] text-sm leading-6 text-muted">{vi.footer.tagline}</p>
        </div>
        <nav aria-label={vi.footer.exploreLabel}>
          <h2 className="text-sm font-semibold">{vi.footer.exploreTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/tracks">{vi.nav.catalog}</Link></li>
            <li><Link href="/pricing">{vi.nav.pricing}</Link></li>
            <li><Link href="/custom-request">{vi.nav.custom}</Link></li>
          </ul>
        </nav>
        <nav aria-label={vi.footer.infoLabel}>
          <h2 className="text-sm font-semibold">{vi.footer.infoTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about">{vi.nav.about}</Link></li>
            <li><Link href="/contact">{vi.nav.contact}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold">{vi.footer.contactTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
            <li><a href={contact.phone.tel}>{contact.phone.display}</a></li>
            {contact.socials.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{vi.social[s.id]}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
        {template(vi.footer.copyright, { year: new Date().getFullYear(), brand: vi.brand.name })}
      </p>
    </footer>
  );
}
