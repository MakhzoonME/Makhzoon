import type { MessageKey } from '@/locales/messages';

/**
 * Route scope:
 *  - 'space' → URL becomes /[locale]/[orgSlug]/[space]/{href}
 *  - 'org'   → URL becomes /[locale]/[orgSlug]/{href}
 * Defaults to 'space' when omitted (most entries are space-scoped).
 */
export type NavScope = 'space' | 'org';

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
  /** Route scope (default 'space'). Org-wide pages (settings, users…) set 'org'. */
  scope?: NavScope;
  /**
   * Optional sub-items rendered beneath this item in the sidebar (Purchases under Raseed, etc.).
   * The parent link remains independently clickable; children only appear when the sidebar is expanded.
   */
  children?: NavItemConfig[];
}

export interface NavGroupConfig {
  type: 'group';
  href: string;
  label: string;
  labelKey: MessageKey;
  adminOnly?: boolean;
  featureKey?: string;
  moduleColor?: string;
  moduleName?: string;
  scope?: NavScope;
  items: NavItemConfig[];
}

export interface NavSeparator { type: 'separator' }
export type NavEntry = NavItemConfig | NavGroupConfig | NavSeparator;

export const ORG_NAV_ENTRIES: NavEntry[] = [
  { href: '/dashboard',    label: 'Dashboard',    labelKey: 'nav.dashboard',    featureKey: 'dashboard' },
  {
    type: 'group', href: '/usool', label: 'Usool', labelKey: 'nav.assets',
    featureKey: 'assets', moduleColor: '#00695C', moduleName: 'أصول',
    items: [
      { href: '/usool', label: 'Overview', labelKey: 'nav.overview',
        featureKey: 'assets', moduleColor: '#00695C', moduleName: 'أصول' },
      { href: '/usool/list', label: 'Asset Register', labelKey: 'nav.assetsList',
        featureKey: 'assets', moduleColor: '#00695C', moduleName: 'أصول' },
      { href: '/usool/audits', label: 'Audits', labelKey: 'nav.assetAudits',
        featureKey: 'assets', permissionKey: 'inventory.audits',
        moduleColor: '#00695C', moduleName: 'أصول' },
    ],
  },
  {
    type: 'group', href: '/raseed', label: 'Raseed', labelKey: 'nav.inventory',
    featureKey: 'inventory', moduleColor: '#E65100', moduleName: 'رصيد',
    items: [
      { href: '/raseed', label: 'Overview', labelKey: 'nav.overview',
        featureKey: 'inventory', moduleColor: '#E65100', moduleName: 'رصيد' },
      { href: '/raseed/list', label: 'Stock Items', labelKey: 'nav.inventoryList',
        featureKey: 'inventory', moduleColor: '#E65100', moduleName: 'رصيد' },
      { href: '/raseed/purchases', label: 'Purchases', labelKey: 'nav.purchases',
        featureKey: 'inventory', permissionKey: 'purchases.view',
        moduleColor: '#BF360C', moduleName: 'مشتريات' },
      { href: '/raseed/audits', label: 'Stock Audits', labelKey: 'nav.stockAudits',
        featureKey: 'inventory', permissionKey: 'inventory.audits',
        moduleColor: '#BF360C', moduleName: 'مراجعات' },
    ],
  },
  {
    type: 'group', href: '/haraka', label: 'Haraka', labelKey: 'nav.pos',
    featureKey: 'pos', moduleColor: '#C2185B', moduleName: 'حركة',
    items: [
      { href: '/haraka', label: 'Overview', labelKey: 'nav.overview',
        featureKey: 'pos', moduleColor: '#C2185B', moduleName: 'حركة' },
      { href: '/haraka/orders', label: 'Orders', labelKey: 'nav.harakaOrders',
        featureKey: 'pos', permissionKey: 'pos.view_orders',
        moduleColor: '#AD1457', moduleName: 'طلبات' },
      { href: '/haraka/customers', label: 'Customers', labelKey: 'nav.customers',
        featureKey: 'pos', permissionKey: 'pos.process_sale',
        moduleColor: '#AD1457', moduleName: 'عملاء' },
      { href: '/haraka/delivery-agents', label: 'Delivery Agents', labelKey: 'nav.deliveryAgents',
        featureKey: 'pos', permissionKey: 'pos.manage_delivery_agents',
        moduleColor: '#AD1457', moduleName: 'موزعون' },
      { href: '/haraka/reports', label: 'Reports', labelKey: 'nav.harakaReports',
        featureKey: 'pos', permissionKey: 'pos.view_reports',
        moduleColor: '#AD1457', moduleName: 'تقارير' },
    ],
  },
  {
    type: 'group', href: '/requests', label: 'Requests', labelKey: 'nav.requests',
    featureKey: 'requests',
    items: [
      { href: '/requests', label: 'Overview', labelKey: 'nav.overview', featureKey: 'requests' },
      { href: '/requests/list', label: 'All Requests', labelKey: 'nav.requestsList', featureKey: 'requests' },
    ],
  },
  { href: '/reports',      label: 'Reports',      labelKey: 'nav.reports',      adminOnly: true, featureKey: 'reports' },
  { type: 'separator' } as NavSeparator,
  { href: '/support',      label: 'Support',      labelKey: 'nav.support',      featureKey: 'support' },
  { href: '/audit-logs',   label: 'Audit Logs',   labelKey: 'nav.auditLogs',    adminOnly: true, featureKey: 'auditLogs' },
  {
    type: 'group',
    href: '/settings',
    label: 'Settings',
    labelKey: 'nav.settings',
    adminOnly: true,
    scope: 'org',
    items: [
      { href: '/settings/organization', label: 'Organization Info', labelKey: 'nav.orgInfo',       permissionKey: 'settings.orgInfo',   scope: 'org' },
      { href: '/settings/spaces',       label: 'Spaces',            labelKey: 'nav.spaces',        permissionKey: 'settings.orgInfo',   scope: 'org' },
      { href: '/settings/lists',        label: 'Lists',             labelKey: 'nav.lists',         permissionKey: 'settings.orgInfo',   scope: 'org' },
      { href: '/subscription',          label: 'Subscription',      labelKey: 'nav.subscription',  permissionKey: 'settings.subscription', scope: 'org' },
      { href: '/users',                 label: 'Users',             labelKey: 'nav.users',         permissionKey: 'settings.users',     scope: 'org' },
      { href: '/settings/tax-rates',    label: 'Tax Rates',         labelKey: 'nav.taxRates',      permissionKey: 'settings.taxRates',  featureKey: 'pos', scope: 'org' },
      { href: '/settings/jo-fotara',    label: 'Jo Fotara',         labelKey: 'nav.fawtara',       permissionKey: 'settings.fawtara',   featureKey: 'pos', scope: 'org' },
      { href: '/settings/receipt',      label: 'Receipt',           labelKey: 'nav.receipt',       permissionKey: 'settings.fawtara',   featureKey: 'pos', scope: 'org' },
    ],
  },
];

/** Flat list of all nav items (groups expanded); sub-items inherit group's adminOnly + scope */
const ORG_NAV_FLAT: NavItemConfig[] = ORG_NAV_ENTRIES.flatMap((entry) => {
  if ('type' in entry && entry.type === 'separator') return [];
  if ('type' in entry && entry.type === 'group') {
    return entry.items.map((item) => ({
      ...item,
      adminOnly: item.adminOnly ?? entry.adminOnly,
      scope: item.scope ?? entry.scope,
    }));
  }
  return [entry as NavItemConfig];
});

/** Prepend locale to a path like `/dashboard` → `/en/dashboard` */
export function withLocale(locale: string, path: string): string {
  if (path.startsWith('http') || path.startsWith('#')) return path;
  return `/${locale}${path}`;
}

/**
 * Build a full URL from a nav entry's `href`, inserting `[space]` for
 * space-scoped routes. Org-wide routes skip the space segment.
 *
 *   buildNavUrl({ locale: 'en', orgSlug: 'acme', space: 'default', entry: usool })
 *     → '/en/acme/default/usool'
 *   buildNavUrl({ ..., entry: settings })  → '/en/acme/settings'
 */
export function buildNavUrl(opts: {
  locale: string;
  orgSlug: string;
  space: string;
  entry: { href: string; scope?: NavScope };
}): string {
  const { locale, orgSlug, space, entry } = opts;
  const isOrgScope = entry.scope === 'org';
  const prefix = isOrgScope
    ? `/${locale}/${orgSlug}`
    : `/${locale}/${orgSlug}/${space}`;
  return `${prefix}${entry.href}`;
}

export function getFirstAccessiblePath(opts: {
  locale: string;
  orgSlug?: string;
  space?: string;
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
    // If the caller passed orgSlug + space, build a full per-tenant URL.
    // Otherwise return the locale-prefixed nav href as before (legacy callers).
    if (opts.orgSlug) {
      return buildNavUrl({
        locale: opts.locale,
        orgSlug: opts.orgSlug,
        space: opts.space ?? 'default',
        entry: item,
      });
    }
    return withLocale(opts.locale, item.href);
  }
  return opts.orgSlug
    ? `/${opts.locale}/${opts.orgSlug}/${opts.space ?? 'default'}/dashboard`
    : withLocale(opts.locale, '/dashboard');
}
