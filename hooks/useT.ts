'use client';
import { useLocaleStore } from '@/store/locale.store';
import { messages, MessageKey } from '@/locales/messages';

export function useT() {
  const { locale } = useLocaleStore();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  function t(key: MessageKey, fallback?: string): string {
    return messages[locale][key] ?? fallback ?? key;
  }

  return { t, locale, dir };
}
