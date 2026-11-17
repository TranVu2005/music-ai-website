export function Card({ className = "", children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <article className={`rounded-3xl border border-line bg-[#faf7f0] p-5 sm:p-8 ${className}`} {...rest}>
      {children}
    </article>
  );
}
