'use client';
import { useThemeStore, Theme } from '@/store/theme.store';
import { useT } from '@/hooks/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';

function SunSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 12.07l1.06-1.06M10.01 4.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function MoonSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M12.5 10A6 6 0 0 1 5 2.5a6 6 0 1 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MonitorSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="2" width="13" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 13h5M7.5 11v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const THEME_ICONS: Record<Theme, React.FC> = {
  light:  SunSVG,
  dark:   MoonSVG,
  system: MonitorSVG,
};

interface Props {
  /** 'ghost' for dark backgrounds (superadmin), 'default' for light backgrounds */
  variant?: 'ghost-dark' | 'ghost-light';
  className?: string;
}

export function ThemeToggle({ variant = 'ghost-light', className }: Props) {
  const { theme, setTheme } = useThemeStore();
  const { t } = useT();
  const Icon = THEME_ICONS[theme];

  const btnClass = cn(
    'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
    variant === 'ghost-dark'
      ? 'text-blue-300 hover:text-blue-100 hover:bg-blue-900/50'
      : 'text-gray-500 hover:text-gray-900 hover:bg-surface-page dark:hover:bg-gray-700/40',
    className,
  );

  const labels: Record<Theme, string> = {
    light:  t('theme.light'),
    dark:   t('theme.dark'),
    system: t('theme.system'),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={btnClass}
          aria-label={`${t('theme.label')} — ${labels[theme]}`}
          aria-haspopup="menu"
        >
          <Icon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36" role="menu" aria-label={t('theme.label')}>
        {(['light', 'dark', 'system'] as Theme[]).map((opt) => {
          const OptionIcon = THEME_ICONS[opt];
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => setTheme(opt)}
              role="menuitemradio"
              aria-checked={theme === opt}
              className={cn(
                'gap-2 cursor-pointer',
                theme === opt && 'font-semibold',
              )}
            >
              <OptionIcon />
              {labels[opt]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
