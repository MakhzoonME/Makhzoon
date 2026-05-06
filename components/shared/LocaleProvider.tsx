'use client';
import { useEffect } from 'react';
import { useLocaleStore } from '@/store/locale.store';

export function LocaleProvider({
  children,
  locale,
  dir,
}: {
  children: React.ReactNode;
  locale: string;
  dir: 'rtl' | 'ltr';
}) {
  const { setLocale } = useLocaleStore();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    setLocale(locale as 'en' | 'ar');
  }, [locale, dir, setLocale]);

  return <>{children}</>;
}
