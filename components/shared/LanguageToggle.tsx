'use client';
import { useLocaleStore } from '@/store/locale.store';
import { useT } from '@/hooks/ui';
import { useRouter, usePathname } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import type { Locale } from '@/locales/messages';

function FlagEN() {
  // Simplified Union Jack
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden style={{ borderRadius: 2, display: 'block' }}>
      <rect width="18" height="12" fill="#012169" rx="1" />
      <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="3.5" />
      <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="2" />
      <rect x="7.5" y="0" width="3" height="12" fill="#fff" />
      <rect x="0" y="4.5" width="18" height="3" fill="#fff" />
      <rect x="8.1" y="0" width="1.8" height="12" fill="#C8102E" />
      <rect x="0" y="5.1" width="18" height="1.8" fill="#C8102E" />
    </svg>
  );
}

function FlagAR() {
  // Saudi Arabia: green with white horizontal band
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden style={{ borderRadius: 2, display: 'block' }}>
      <rect width="18" height="12" fill="#006C35" rx="1" />
      <rect y="4" width="18" height="4" fill="#fff" />
      <rect y="4" width="18" height="4" fill="#006C35" fillOpacity="0.15" />
    </svg>
  );
}

function GlobeSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.5 1.5C7.5 1.5 5 4 5 7.5s2.5 6 2.5 6M7.5 1.5C7.5 1.5 10 4 10 7.5s-2.5 6-2.5 6M1.5 7.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.5 5h10M2.5 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  variant?: 'ghost-dark' | 'ghost-light';
  className?: string;
}

export function LanguageToggle({ variant = 'ghost-light', className }: Props) {
  const { locale, setLocale } = useLocaleStore();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: Locale) {
    setLocale(newLocale);
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `makhzoon-locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    const newPath = pathname.replace(/^\/(en|ar)/, `/${newLocale}`);
    router.push(newPath);
  }

  const btnClass = cn(
    'flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors',
    variant === 'ghost-dark'
      ? 'text-blue-300 hover:text-blue-100 hover:bg-blue-900/50'
      : 'text-gray-500 hover:text-gray-900 hover:bg-surface-page dark:hover:bg-gray-700/40',
    className,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={btnClass} aria-label={t('lang.label')}>
          <GlobeSVG />
          <span>{locale === 'en' ? 'EN' : 'ع'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(['en', 'ar'] as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={cn(
              'gap-2 cursor-pointer',
              locale === loc && 'font-semibold',
            )}
          >
            {loc === 'en' ? <FlagEN /> : <FlagAR />}
            {loc === 'en' ? t('lang.en') : t('lang.ar')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
