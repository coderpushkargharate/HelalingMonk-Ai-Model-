import { ReactNode } from 'react';

/** Consistent hero header for interior marketing pages. */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center md:pt-20">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-600">{eyebrow}</p>
      <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        {title}
      </h1>
      {subtitle && <p className="mx-auto mt-5 max-w-2xl text-base text-slate-500 sm:text-lg">{subtitle}</p>}
      {children && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </section>
  );
}
