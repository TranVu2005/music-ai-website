import type { Metadata } from "next";
import { vi } from "./i18n/vi";

type PageMeta = { title: string; description: string };

// Builds per-route metadata with OpenGraph tags. Title format matches the existing catalog pages.
export function pageMetadata(meta: PageMeta, path: string): Metadata {
  const title = `${meta.title} – ${vi.brand.name}`;
  return {
    title,
    description: meta.description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: meta.description,
      url: path,
      siteName: vi.brand.name,
      locale: vi.meta.ogLocale,
      type: "website",
    },
  };
}
