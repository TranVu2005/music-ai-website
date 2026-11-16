"use client";

import { vi } from "../../lib/i18n/vi";

type Props = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  variant: "genre" | "mood";
};

export function FilterGroup({ label, options, value, onChange, variant }: Props) {
  const selected = variant === "genre" ? "bg-ink text-white" : "bg-rust text-white";
  const idle =
    variant === "genre"
      ? "border border-line hover:border-ink"
      : "border border-dashed border-muted/50 hover:border-ink";
  const items = [{ key: "", text: vi.catalog.all }, ...options.map((o) => ({ key: o, text: o }))];

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
      <h2 className="w-20 shrink-0 text-sm font-semibold">{label}</h2>
      <ul className="noscroll -mx-5 flex gap-2 overflow-x-auto px-5 text-sm lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const isSelected = value === item.key;
          return (
            <li key={item.key || "__all"}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChange(item.key)}
                className={`block whitespace-nowrap rounded-full px-5 py-2.5 ${
                  isSelected ? `${selected} font-medium` : idle
                }`}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
