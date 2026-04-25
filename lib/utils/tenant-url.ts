export function buildOrgPath(orgSlug: string, pathname = '/dashboard'): string {
  return `/${orgSlug}${pathname}`;
}

export function buildSuperAdminPath(pathname = '/dashboard'): string {
  return `/superadmin${pathname}`;
}
