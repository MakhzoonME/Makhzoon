import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/components/shared/LocaleProvider';
import { LocaleContextProvider } from '@/components/shared/LocaleContext';
import { VersionCheck } from '@/components/shared/VersionCheck';

const LOCALES = ['en', 'ar'] as const;

function isValidLocale(locale: string): locale is (typeof LOCALES)[number] {
  return LOCALES.includes(locale as (typeof LOCALES)[number]);
}

/**
 * Enumerate the locale segment so Next can prerender the static-eligible
 * leaves (marketing pages, login, signup) for each locale instead of
 * rendering every route on demand. Data-driven pages under [orgSlug]/[space]
 * stay dynamic because their own params aren't enumerated and they read
 * request state.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
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
        <VersionCheck />
      </LocaleProvider>
    </LocaleContextProvider>
  );
}
