import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/components/shared/LocaleProvider';
import { LocaleContextProvider } from '@/components/shared/LocaleContext';

const LOCALES = ['en', 'ar'] as const;

function isValidLocale(locale: string): locale is (typeof LOCALES)[number] {
  return LOCALES.includes(locale as (typeof LOCALES)[number]);
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isValidLocale(params.locale)) {
    notFound();
  }

  const dir = params.locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LocaleContextProvider locale={params.locale} dir={dir}>
      <LocaleProvider locale={params.locale} dir={dir}>
        {children}
      </LocaleProvider>
    </LocaleContextProvider>
  );
}
