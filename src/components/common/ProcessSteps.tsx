import { vi } from "../../lib/i18n/vi";

export function ProcessSteps({ dark = false }: { dark?: boolean }) {
  const border = dark ? "border-white/15" : "border-line";
  const num = dark ? "text-[#e08a76]" : "text-rust";
  const body = dark ? "text-white/65" : "text-muted";
  return (
    <ol className="grid gap-0 lg:grid-cols-4 lg:gap-6" data-testid="process-steps">
      {vi.process.steps.map((step, i) => (
        <li key={step.title} className={`flex gap-4 border-t ${border} py-5 lg:block lg:py-6`}>
          <span className={`font-display text-2xl ${num}`}>{String(i + 1).padStart(2, "0")}</span>
          <div className="lg:mt-3">
            <h3 className="font-semibold lg:text-lg">{step.title}</h3>
            <p className={`mt-1 text-sm leading-6 ${body}`}>{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
