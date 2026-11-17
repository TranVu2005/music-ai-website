"use client";

import { vi } from "../../lib/i18n/vi";
import { template } from "../../lib/format";

type Props = { page: number; totalPages: number; onChange: (page: number) => void };

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

export function PaginationBar({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={vi.catalog.pagination.label} className="mt-12">
      <ul className="flex items-center justify-center gap-3 text-sm font-medium">
        <li>
          <button
            type="button"
            aria-label={vi.catalog.pagination.previous}
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted disabled:opacity-50"
          >
            ‹
          </button>
        </li>
        {pageWindow(page, totalPages).map((p) => (
          <li key={p}>
            <button
              type="button"
              aria-label={template(vi.catalog.pagination.page, { page: p })}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onChange(p)}
              className={`grid h-11 w-11 place-items-center rounded-full ${p === page ? "bg-ink text-white" : ""}`}
            >
              {p}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label={vi.catalog.pagination.next}
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink disabled:opacity-50"
          >
            ›
          </button>
        </li>
      </ul>
    </nav>
  );
}
