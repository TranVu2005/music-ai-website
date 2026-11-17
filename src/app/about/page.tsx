import { ButtonLink } from "../../components/common/Button";
import { vi } from "../../lib/i18n/vi";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(vi.meta.about, "/about");

const t = vi.about;

export default function AboutPage() {
  return (
    <main id="noi-dung" className="mx-auto max-w-7xl px-5 pb-40 pt-10 lg:px-8 lg:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/portrait-placeholder.svg"
          alt={t.portraitAlt}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
        <div>
          <h1 className="font-display text-4xl font-bold lg:text-5xl">{t.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{t.intro}</p>
        </div>
      </div>

      <section aria-labelledby="tieu-su" className="mt-16 max-w-3xl">
        <h2 id="tieu-su" className="font-display text-3xl font-bold">{t.bioTitle}</h2>
        <p className="mt-4 leading-8 text-muted">{t.bio}</p>
      </section>

      <section aria-labelledby="hanh-trinh" className="mt-16">
        <h2 id="hanh-trinh" className="font-display text-3xl font-bold">{t.journeyTitle}</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {t.journey.map((step) => (
            <li key={step.title} className="rounded-2xl border border-line bg-[#faf7f0] p-6">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="triet-ly" className="mt-16 max-w-3xl">
        <h2 id="triet-ly" className="font-display text-3xl font-bold">{t.philosophyTitle}</h2>
        <p className="mt-4 leading-8 text-muted">{t.philosophy}</p>
      </section>

      <section className="mt-16 rounded-3xl bg-ink p-8 text-white lg:p-12" aria-label={t.cta}>
        <p className="font-display text-3xl font-bold">{t.cta}</p>
        <ButtonLink href="/custom-request" className="mt-6">{vi.common.customCta}</ButtonLink>
      </section>
    </main>
  );
}
