"use client";

import { vi } from "../../lib/i18n/vi";

type Props = { value: string; onChange: (value: string) => void };

export function TrackSearchInput({ value, onChange }: Props) {
  return (
    <form role="search" className="w-full lg:w-[28rem]" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="track-search" className="mb-2 block text-sm font-semibold">
        {vi.catalog.searchLabel}
      </label>
      <div className="flex items-center gap-3 rounded-full border border-line bg-[#faf7f0] px-5 py-3.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="track-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={vi.catalog.searchPlaceholder}
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>
    </form>
  );
}
