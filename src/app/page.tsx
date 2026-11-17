import Link from "next/link";
import { ButtonLink } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ProcessSteps } from "../components/common/ProcessSteps";
import { vi } from "../lib/i18n/vi";
import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata(vi.meta.home, "/");

const t = vi.home;

export default function Home() {
  return (
    <main id="noi-dung">
      <section
        aria-labelledby="hero-title"
        className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-20"
      >
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 id="hero-title" className="font-display mt-5 text-[2.6rem] font-bold leading-[1.08] sm:text-6xl lg:text-[4.25rem]">
            {t.title}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">{t.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/tracks">
              {t.ctaCatalog} <span aria-hidden="true">→</span>
            </ButtonLink>
            <ButtonLink href="/custom-request" variant="outline">{t.ctaCustom}</ButtonLink>
          </div>
          <ul className="mt-10 hidden max-w-lg grid-cols-3 gap-6 border-t border-line pt-5 text-sm sm:grid">
            {t.values.map((v) => (
              <li key={v.title}>
                <strong className="block font-semibold">{v.title}</strong>
                <span className="text-muted">{v.body}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:pr-6 lg:pt-6">
          <div className="absolute inset-0 hidden translate-x-6 translate-y-6 rounded-3xl bg-ink lg:block" aria-hidden="true" />
          <Card className="relative" aria-label={t.featuredLabel}>
            <div className="relative flex aspect-[16/9] items-end overflow-hidden rounded-2xl bg-[#2f3e4a] p-5 text-white sm:aspect-[16/8.5] sm:p-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/artwork-lofi-dem-dong.svg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <p className="absolute left-5 top-5 text-[.7rem] font-semibold uppercase tracking-[.14em] sm:left-7 sm:top-6">
                {t.featuredLabel}
              </p>
              <h2 className="font-display relative text-2xl font-semibold leading-tight sm:text-4xl">{t.featuredTitle}</h2>
            </div>
            <p className="mt-5 text-sm text-muted">
              {vi.brand.name} · {t.featuredMeta}
            </p>
            <Link href="/tracks" className="mt-4 inline-block border-b border-ink pb-0.5 text-sm font-semibold">
              {t.featuredCta} <span aria-hidden="true">→</span>
            </Link>
          </Card>
        </div>
      </section>

      <section aria-labelledby="noi-bat" className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-28">
        <p className="eyebrow">{t.featuredEyebrow}</p>
        <h2 id="noi-bat" className="font-display mt-3 text-3xl font-bold sm:text-4xl lg:text-[2.5rem]">{t.latestTitle}</h2>
        <p className="mt-4 max-w-xl text-muted">{t.latestIntro}</p>
        <Link href="/tracks" className="mt-6 inline-block whitespace-nowrap border-b border-ink pb-0.5 text-sm font-semibold">
          {vi.common.viewAll} <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section id="nghe-si" className="bg-cream2" aria-labelledby="ten-nghe-si">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/portrait-placeholder.svg"
            alt={t.artistPortraitAlt}
            className="aspect-[4/3] w-full rounded-2xl object-cover lg:aspect-[600/460]"
            loading="lazy"
          />
          <div>
            <p className="eyebrow">{t.artistEyebrow}</p>
            <h2 id="ten-nghe-si" className="font-display mt-5 text-4xl font-bold lg:text-5xl">{t.artistName}</h2>
            <p className="mt-5 text-lg leading-8 text-muted">{t.artistBio}</p>
            <blockquote className="font-display mt-6 text-2xl italic leading-9">{t.artistQuote}</blockquote>
            <Link href="/about" className="mt-6 inline-block border-b border-ink pb-0.5 text-sm font-semibold">
              {t.artistMore}
            </Link>
          </div>
        </div>
      </section>

      <section id="sang-tac-rieng" className="bg-ink text-white" aria-labelledby="dat-nhac">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow !text-[#e08a76]">{t.customEyebrow}</p>
              <h2 id="dat-nhac" className="font-display mt-4 text-4xl font-bold leading-tight lg:text-5xl">{t.customTitle}</h2>
              <p className="mt-5 leading-7 text-white/70">{t.customBody}</p>
            </div>
            <ButtonLink href="/custom-request" className="hidden shrink-0 lg:inline-flex">
              {vi.common.customCtaLong}
            </ButtonLink>
          </div>
          <div className="mt-12">
            <ProcessSteps dark />
          </div>
          <ButtonLink href="/custom-request" className="mt-8 w-full lg:hidden">
            {vi.common.customCtaLong}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
