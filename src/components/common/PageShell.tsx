import { ReactNode } from 'react';
import { Activity } from 'lucide-react';

/**
 * The shared light "soft emerald" backdrop used across the public assessment
 * flow, so every screen reads as one continuous, clean website. Renders subtle
 * ambient glows on a near-white base, an optional slim header (brand + step),
 * and centers the page content.
 */
export default function PageShell({
  children,
  step,
  maxWidth = 'max-w-3xl',
}: {
  children: ReactNode;
  /** Optional right-aligned step label, e.g. "Step 1 of 2". */
  step?: string;
  /** Tailwind max-width class for the content column. */
  maxWidth?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6faf8] text-slate-900">
      {/* Ambient soft glows — light and airy, not heavy. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-300/25 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-200/25 blur-[140px]" />
      </div>

      {/* Brand header */}
      <header className={`relative z-10 mx-auto flex ${maxWidth} items-center justify-between px-6 py-5`}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">HealingMonk</span>
        </div>
        {step && (
          <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 backdrop-blur">
            {step}
          </span>
        )}
      </header>

      <main className={`relative z-10 mx-auto ${maxWidth} px-6 pb-16`}>{children}</main>
    </div>
  );
}

/** A clean white card matching the home-page feature cards. */
export function GlassCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
