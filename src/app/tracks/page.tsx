import type { Metadata } from "next";
import { CatalogBrowser } from "../../components/catalog/CatalogBrowser";
import { vi } from "../../lib/i18n/vi";

export const metadata: Metadata = { title: `${vi.catalog.title} – ${vi.brand.name}` };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TracksPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rawPage = Number.parseInt(first(sp.page) ?? "", 10);
  return (
    <main id="noi-dung" className="mx-auto max-w-7xl px-5 pb-40 pt-8 lg:px-8 lg:pt-14">
      <CatalogBrowser
        initial={{
          q: first(sp.q),
          genre: first(sp.genre),
          mood: first(sp.mood),
          page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
        }}
      />
    </main>
  );
}
