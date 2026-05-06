'use client';
import { useLocaleContext } from '@/components/shared/LocaleContext';
import { messages, MessageKey } from '@/locales/messages';

export function useT() {
  const { locale, dir } = useLocaleContext();

  function t(key: MessageKey, fallback?: string): string {
    return messages[locale][key] ?? fallback ?? key;
  }

  return { t, locale, dir };
}
