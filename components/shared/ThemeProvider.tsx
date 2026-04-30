'use client';
import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme.store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(dark: boolean) {
      root.classList.toggle('dark', dark);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    applyTheme(theme === 'dark');
  }, [theme]);

  return <>{children}</>;
}
