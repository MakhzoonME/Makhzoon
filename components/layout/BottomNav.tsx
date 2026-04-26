'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/utils/cn';

function DashboardSVG() { return <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="6" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="2" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="10" y="8" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><rect x="2" y="11" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>; }
function AssetsSVG() { return <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M15 5.5L9 2.5 3 5.5v7L9 15.5l6-3v-7z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M9 2.5v13M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function InventorySVG() { return <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="5" width="14" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M6 10h6M9 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function WarrantySVG() { return <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 1.5L2.5 4v6.5C2.5 13.8 5.5 16.5 9 17.5c3.5-1 6.5-3.7 6.5-7V4L9 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function MenuSVG() { return <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardSVG },
  { href: '/assets',    label: 'Assets',    Icon: AssetsSVG },
  { href: '/inventory', label: 'Inventory', Icon: InventorySVG },
  { href: '/warranties', label: 'Warranties', Icon: WarrantySVG },
];

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { setMobileMenuOpen } = useUiStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex md:hidden safe-area-pb">
      {PRIMARY_NAV.map(({ href, label, Icon }) => {
        const fullHref = `/${orgSlug}${href}`;
        const active = pathname === fullHref || pathname.startsWith(fullHref + '/');
        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors duration-150',
              active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900',
            )}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
      {/* More / Menu button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150"
      >
        <MenuSVG />
        <span>More</span>
      </button>
    </nav>
  );
}
