'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/utils/cn';

function DashboardSVG() { return <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="6" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="2" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="8" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="2" y="11" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>; }
function AssetsSVG() { return <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M15 5.5L9 2.5 3 5.5v7L9 15.5l6-3v-7z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M9 2.5v13M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function RequestsSVG() { return <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5 6h8M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function WarrantySVG() { return <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 1.5L2.5 4v6.5C2.5 13.8 5.5 16.5 9 17.5c3.5-1 6.5-3.7 6.5-7V4L9 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function MenuSVG() { return <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Home',       Icon: DashboardSVG },
  { href: '/assets',    label: 'Assets',     Icon: AssetsSVG },
  { href: '/requests',  label: 'Requests',   Icon: RequestsSVG },
  { href: '/warranties',label: 'Warranties', Icon: WarrantySVG },
];

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const locale = params?.locale ?? 'en';
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { setMobileMenuOpen } = useUiStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card border-t border-border flex md:hidden" style={{ height: 64, paddingBottom: 4 }}>
      {PRIMARY_NAV.map(({ href, label, Icon }) => {
        const fullHref = `/${locale}/${orgSlug}${href}`;
        const active = pathname === fullHref || pathname.startsWith(fullHref + '/');
        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 text-[10px] font-medium transition-colors duration-fast relative',
              active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-700',
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-600 rounded-b" />
            )}
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
      {/* More / Menu button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-700 transition-colors duration-fast"
      >
        <MenuSVG />
        <span>More</span>
      </button>
    </nav>
  );
}
