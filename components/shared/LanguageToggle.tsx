'use client';
import { useLocaleStore } from '@/store/locale.store';
import { useT } from '@/hooks/ui';
import { useRouter, usePathname } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import type { Locale } from '@/locales/messages';

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
    const newPath = pathname.replace(/^\/(en|ar)/, `/${newLocale}`);
    router.push(newPath);
  }

  const btnClass = cn(
    'flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-medium transition-colors',
    variant === 'ghost-dark'
      ? 'text-blue-300 hover:text-blue-100 hover:bg-blue-900/50'
      : 'text-gray-500 hover:text-gray-900 hover:bg-surface-page dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700',
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
              'gap-2 cursor-pointer dark:text-gray-200 dark:focus:bg-gray-700',
              locale === loc && 'font-semibold',
            )}
          >
            <span className="text-base">{loc === 'en' ? '🇬🇧' : '🇸🇦'}</span>
            {loc === 'en' ? t('lang.en') : t('lang.ar')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
