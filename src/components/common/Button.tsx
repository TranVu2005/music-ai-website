import Link from "next/link";

type Variant = "primary" | "outline" | "dark";

const styles: Record<Variant, string> = {
  primary: "bg-rust text-white",
  outline: "border border-ink",
  dark: "bg-ink text-white",
};

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 font-semibold ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
