const LOCALE_RE = /^\/(en|ar)(\/|$)/;

/**
 * Build a tenant URL.
 *
 * `pathname` defaults to `/dashboard` (space-scoped), so the URL becomes
 * `/[locale]/[orgSlug]/[space]/dashboard`. Pass `space='default'` (or omit)
 * to land on the org's Default space — every org has one (auto-created).
 *
 * For org-wide paths (e.g. `/settings/organization`, `/users`), pass
 * `space=null` to skip the space segment.
 */
export function buildOrgPath(
  locale: string,
  orgSlug: string,
  pathname = '/dashboard',
  space: string | null = 'default',
): string {
  const cleanPath = pathname.replace(LOCALE_RE, '$2') || '/';
  const spaceSeg = space ? `/${space}` : '';
  return `/${locale}/${orgSlug}${spaceSeg}${cleanPath}`;
}

export function buildSuperAdminPath(locale: string, pathname = '/dashboard'): string {
  const cleanPath = pathname.replace(LOCALE_RE, '$2') || '/';
  return `/${locale}/superadmin${cleanPath}`;
}
