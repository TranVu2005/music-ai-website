import { vi } from "../../lib/i18n/vi";
import { template } from "../../lib/format";
import { formatVnd, hasPlaceholderPrice, type PricingConfig } from "../../config/pricing";
import { ButtonLink } from "../common/Button";
import { PlaceholderBadge } from "../common/PlaceholderBadge";
import { ProcessSteps } from "../common/ProcessSteps";

export function PricingContent({ config }: { config: PricingConfig }) {
  const t = vi.pricing;
  return (
    <main id="noi-dung" className="mx-auto max-w-7xl px-5 pb-40 pt-10 lg:px-8 lg:pt-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold lg:text-5xl">{t.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{t.intro}</p>
        {hasPlaceholderPrice(config) && (
          <p className="mt-4 flex items-center gap-3 text-sm text-muted">
            <PlaceholderBadge />
            <span>{vi.common.placeholderBadgeNote}</span>
          </p>
        )}
      </header>

      <section aria-labelledby="bang-giay-phep" className="mt-14">
        <h2 id="bang-giay-phep" className="font-display text-3xl font-bold">{t.licensesTitle}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-[#faf7f0]">
          <table className="w-full min-w-[34rem] text-left text-sm" data-testid="license-table">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">{t.licenseColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.priceColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.rightsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {config.licenses.map((license) => {
                const copy = t.licenses[license.id];
                return (
                  <tr key={license.id} className="border-b border-line align-top last:border-b-0">
                    <th scope="row" className="px-5 py-4 text-base font-semibold">{copy.name}</th>
                    <td className="px-5 py-4 font-semibold">
                      {template(t.fromPrice, { price: formatVnd(license.fromPriceVnd) })}
                    </td>
                    <td className="px-5 py-4">
                      <ul className="list-inside list-disc space-y-1 text-muted">
                        {copy.rights.slice(0, license.rightsCount).map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="bang-goi" className="mt-14">
        <h2 id="bang-goi" className="font-display text-3xl font-bold">{t.packagesTitle}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-[#faf7f0]">
          <table className="w-full min-w-[56rem] text-left text-sm" data-testid="package-table">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">{t.packageColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.rangeColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.revisionsColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.deliveryColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.deliverablesColumn}</th>
                <th scope="col" className="px-5 py-4 font-semibold">{t.addOnsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {config.packages.map((pkg, index) => {
                const copy = t.packages[pkg.id];
                const addOnNames = copy.addOns as Record<string, string>;
                return (
                  <tr key={pkg.id} className="border-b border-line align-top last:border-b-0">
                    <th scope="row" className="px-5 py-4 text-base font-semibold">
                      {vi.customRequest.tiers[index]}
                    </th>
                    <td className="px-5 py-4 font-semibold">
                      {template(t.range, { min: formatVnd(pkg.minVnd), max: formatVnd(pkg.maxVnd) })}
                    </td>
                    <td className="px-5 py-4">{template(t.revisions, { count: pkg.freeRevisions })}</td>
                    <td className="px-5 py-4">{template(t.delivery, { days: pkg.deliveryDays })}</td>
                    <td className="px-5 py-4">
                      <ul className="list-inside list-disc space-y-1 text-muted">
                        {copy.deliverables.slice(0, pkg.deliverablesCount).map((d) => <li key={d}>{d}</li>)}
                      </ul>
                    </td>
                    <td className="px-5 py-4">
                      <ul className="space-y-1 text-muted">
                        {pkg.addOns.map((a) => (
                          <li key={a.id}>
                            {addOnNames[a.id]}: <span className="font-semibold text-ink">+{formatVnd(a.priceVnd)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="quy-trinh" className="mt-14">
        <h2 id="quy-trinh" className="font-display text-3xl font-bold">{t.processTitle}</h2>
        <div className="mt-6">
          <ProcessSteps />
        </div>
      </section>

      <section aria-labelledby="cta-gia" className="mt-14 rounded-3xl bg-ink p-8 text-white lg:p-12">
        <h2 id="cta-gia" className="font-display text-3xl font-bold">{t.ctaTitle}</h2>
        <p className="mt-3 max-w-xl text-white/70">{t.ctaBody}</p>
        <ButtonLink href="/custom-request" className="mt-6">{vi.common.customCtaLong}</ButtonLink>
      </section>
    </main>
  );
}
