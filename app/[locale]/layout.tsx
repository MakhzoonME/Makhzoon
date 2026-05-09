import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/components/shared/LocaleProvider';
import { LocaleContextProvider } from '@/components/shared/LocaleContext';

const LOCALES = ['en', 'ar'] as const;

function isValidLocale(locale: string): locale is (typeof LOCALES)[number] {
  return LOCALES.includes(locale as (typeof LOCALES)[number]);
}

export default async function LocaleLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

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
