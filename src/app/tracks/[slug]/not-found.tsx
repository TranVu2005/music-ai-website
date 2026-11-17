import Link from "next/link";
import { vi } from "../../../lib/i18n/vi";

export default function TrackNotFound() {
  return (
    <main id="noi-dung" className="mx-auto max-w-3xl px-5 py-24 text-center">
      <h1 className="font-display text-4xl font-bold">{vi.trackDetail.notFoundTitle}</h1>
      <p className="mt-4 text-muted">{vi.trackDetail.notFoundBody}</p>
      <Link href="/tracks" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
        {vi.trackDetail.notFoundCta}
      </Link>
    </main>
  );
}
