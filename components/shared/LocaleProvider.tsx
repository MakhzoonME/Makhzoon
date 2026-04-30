'use client';
import { useEffect } from 'react';
import { useLocaleStore } from '@/store/locale.store';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocaleStore();

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir  = dir;
  }, [locale]);

  return <>{children}</>;
}
