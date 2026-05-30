'use client';
import { createContext, useContext } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
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
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </LocaleContext.Provider>
  );
}
