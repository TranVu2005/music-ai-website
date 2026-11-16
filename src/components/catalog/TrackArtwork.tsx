const GRADIENTS = [
  "from-[#b0412a] to-[#1d1b18]",
  "from-[#6b645a] to-[#1d1b18]",
  "from-[#d9a15b] to-[#b0412a]",
  "from-[#3e5c63] to-[#1d1b18]",
];

function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

type Props = {
  slug: string;
  coverImageUrl: string | null;
  alt: string;
  className?: string;
};

/** Public cover image, or a deterministic gradient when the track has no cover. */
export function TrackArtwork({ slug, coverImageUrl, alt, className = "" }: Props) {
  if (coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverImageUrl} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={`h-full w-full bg-gradient-to-br ${pickGradient(slug)} ${className}`}
    />
  );
}
