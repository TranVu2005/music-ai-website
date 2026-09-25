import CustomRequestForm from "../../components/forms/CustomRequestForm";
import { vi } from "../../lib/i18n/vi";

const copy = vi.customRequest;

export default function CustomRequestPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">{copy.title}</h1>
        <p className="text-base leading-7 text-neutral-700">{copy.intro}</p>
      </header>
      <section aria-labelledby="service-tiers" className="mb-8 rounded-lg bg-neutral-100 p-5">
        <h2 id="service-tiers" className="mb-3 text-lg font-semibold text-neutral-900">{copy.tiersTitle}</h2>
        <ul className="list-inside list-disc space-y-1 text-neutral-700">
          {copy.tiers.map((tier) => <li key={tier}>{tier}</li>)}
        </ul>
      </section>
      <CustomRequestForm />
    </main>
  );
}
