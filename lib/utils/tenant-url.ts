const LOCALE_RE = /^\/(en|ar)(\/|$)/;

export function buildOrgPath(locale: string, orgSlug: string, pathname = '/dashboard'): string {
  const cleanPath = pathname.replace(LOCALE_RE, '$2') || '/';
  return `/${locale}/${orgSlug}${cleanPath}`;
}

export function buildSuperAdminPath(locale: string, pathname = '/dashboard'): string {
  const cleanPath = pathname.replace(LOCALE_RE, '$2') || '/';
  return `/${locale}/superadmin${cleanPath}`;
}
