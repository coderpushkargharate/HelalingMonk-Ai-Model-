import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';

/**
 * Shared chrome for every public marketing page: the light "soft emerald"
 * backdrop, a sticky nav, and the footer. Child pages render through <Outlet/>.
 * Scrolls to top on route change so navigating feels like a real website.
 */
export default function MarketingLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6faf8] text-slate-900">
      {/* Ambient soft glows shared across all pages. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-300/20 blur-[120px]" />
        <div className="absolute top-1/4 -left-32 h-[360px] w-[360px] rounded-full bg-teal-200/25 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-200/20 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteNav />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
