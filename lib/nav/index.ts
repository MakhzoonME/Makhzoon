import type { MessageKey } from '@/locales/messages';

export interface NavItemConfig {
  href: string;
  label: string;
  labelKey: MessageKey;
  adminOnly?: boolean;
  featureKey?: string;
  /** dot-separated permission key, e.g. 'settings.orgInfo' — grants access to staff with that specific permission */
  permissionKey?: string;
  /** Module brand color (hex). Present only on named Makhzoon modules (Usool, Raseed, etc.) */
  moduleColor?: string;
  /** Module brand name (Arabic). Shown as a subtitle in expanded sidebar. */
  moduleName?: string;
}

export interface NavGroupConfig {
  type: 'group';
  href: string;
  label: string;
  labelKey: MessageKey;
  adminOnly?: boolean;
  items: NavItemConfig[];
}

export type NavEntry = NavItemConfig | NavGroupConfig;

export const ORG_NAV_ENTRIES: NavEntry[] = [
  { href: '/dashboard',    label: 'Dashboard',    labelKey: 'nav.dashboard',    featureKey: 'dashboard' },
  { href: '/usool',        label: 'Usool',        labelKey: 'nav.assets',       featureKey: 'assets',    moduleColor: '#00695C', moduleName: 'أصول' },
  { href: '/raseed',       label: 'Raseed',       labelKey: 'nav.inventory',    featureKey: 'inventory', moduleColor: '#E65100', moduleName: 'رصيد' },
  { href: '/requests',     label: 'Requests',     labelKey: 'nav.requests',     featureKey: 'requests' },
  { href: '/reports',      label: 'Reports',      labelKey: 'nav.reports',      adminOnly: true, featureKey: 'reports' },
  { href: '/support',      label: 'Support',      labelKey: 'nav.support',      featureKey: 'support' },
  { href: '/audit-logs',   label: 'Audit Logs',   labelKey: 'nav.auditLogs',    adminOnly: true, featureKey: 'auditLogs' },
  {
    type: 'group',
    href: '/settings',
    label: 'Settings',
    labelKey: 'nav.settings',
    adminOnly: true,
    items: [
      { href: '/settings/organization', label: 'Organization Info', labelKey: 'nav.orgInfo',       permissionKey: 'settings.orgInfo' },
      { href: '/subscription',          label: 'Subscription',      labelKey: 'nav.subscription',  permissionKey: 'settings.subscription' },
      { href: '/users',                 label: 'Users',             labelKey: 'nav.users',         permissionKey: 'settings.users' },
    ],
  },
];

/** Flat list of all nav items (groups expanded); sub-items inherit group's adminOnly */
const ORG_NAV_FLAT: NavItemConfig[] = ORG_NAV_ENTRIES.flatMap((entry) => {
  if ('type' in entry && entry.type === 'group') {
    return entry.items.map((item) => ({
      ...item,
      adminOnly: item.adminOnly ?? entry.adminOnly,
    }));
  }
  return [entry as NavItemConfig];
});

/** Prepend locale to a path like `/dashboard` → `/en/dashboard` */
export function withLocale(locale: string, path: string): string {
  if (path.startsWith('http') || path.startsWith('#')) return path;
  return `/${locale}${path}`;
}

export function getFirstAccessiblePath(opts: {
  locale: string;
  role: string;
  features: Record<string, boolean>;
  permissions?: Record<string, Record<string, boolean>> | null;
}): string {
  const isAdmin = opts.role === 'admin' || opts.role === 'super_admin' || opts.role === 'org_owner';
  for (const item of ORG_NAV_FLAT) {
    if (item.adminOnly && !isAdmin) continue;
    if (item.featureKey && !opts.features[item.featureKey]) continue;
    if (!isAdmin && item.featureKey && opts.permissions) {
      const mod = opts.permissions[item.featureKey];
      if (mod && mod['view'] === false) continue;
    }
    return withLocale(opts.locale, item.href);
  }
  return withLocale(opts.locale, '/dashboard');
}
