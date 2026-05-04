'use client';
import { createContext, useContext } from 'react';
import { Locale } from '@/locales/messages';

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  dir: 'ltr',
});

export function useLocaleContext() {
  return useContext(LocaleContext);
}

export function LocaleContextProvider({
  locale,
  dir,
  children,
}: {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dir }}>
      {children}
    </LocaleContext.Provider>
  );
}
