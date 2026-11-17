import { contact } from "../../config/contact";
import { ButtonLink } from "../../components/common/Button";
import { vi } from "../../lib/i18n/vi";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(vi.meta.contact, "/contact");

const t = vi.contactPage;

export default function ContactPage() {
  const rows = [
    { label: t.phone, text: contact.phone.display, href: contact.phone.tel },
    { label: t.email, text: contact.email, href: `mailto:${contact.email}` },
    { label: t.zalo, text: contact.zaloUrl, href: contact.zaloUrl },
    { label: t.messenger, text: contact.messengerUrl, href: contact.messengerUrl },
  ];
  return (
    <main id="noi-dung" className="mx-auto max-w-3xl px-5 pb-40 pt-10 lg:px-8 lg:pt-16">
      <h1 className="font-display text-4xl font-bold lg:text-5xl">{t.title}</h1>
      <p className="mt-4 text-lg leading-8 text-muted">{t.intro}</p>
      <dl className="mt-10 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
            <dt className="w-40 shrink-0 text-sm font-semibold text-muted">{row.label}</dt>
            <dd><a href={row.href} className="font-medium hover:text-rust">{row.text}</a></dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
          <dt className="w-40 shrink-0 text-sm font-semibold text-muted">{t.location}</dt>
          <dd>{contact.address}</dd>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
          <dt className="w-40 shrink-0 text-sm font-semibold text-muted">{t.socials}</dt>
          <dd>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {contact.socials.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-rust">
                    {vi.social[s.id]}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <p className="mt-10 text-muted">{t.customPrompt}</p>
      <ButtonLink href="/custom-request" className="mt-4">{vi.common.customCta}</ButtonLink>
    </main>
  );
}
